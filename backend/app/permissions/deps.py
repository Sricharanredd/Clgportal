"""Authentication & authorization dependencies (the security gate).

Flow: Bearer token → decode → load user + roles → resolve effective
permissions → attach `AuthContext` → `require_permission(...)` enforces.

NEVER trust role/branch/permission values supplied by the client:
permissions always come from the database for the authenticated user.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import jwt as pyjwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import decode_token
from app.models.user import Role, RolePermission, User, UserRole

STAFF_ROLES = frozenset({"principal", "administrator", "accounts", "faculty"})
READONLY_ROLES = frozenset({"parent", "student"})


@dataclass(frozen=True)
class AuthContext:
    """Server-derived identity + effective authorization data."""

    user_id: int
    email: str
    full_name: str
    roles: frozenset[str]
    permissions: frozenset[str]
    is_active: bool
    # Faculty scope: None => unrestricted (non-faculty staff).
    # Otherwise the set of assigned branch/class/subject ids.
    branch_scope: frozenset[int] | None = None
    class_scope: frozenset[int] | None = None
    subject_scope: frozenset[int] | None = None
    # Read-only principal (verified parent/student session): student ids
    # this session is allowed to view. parent_id identifies the parent row
    # (parents are not `users` rows).
    linked_student_ids: frozenset[int] = field(default_factory=frozenset)
    parent_id: int | None = None

    @property
    def is_staff(self) -> bool:
        return bool(self.roles & STAFF_ROLES)

    @property
    def is_readonly_principal(self) -> bool:
        return bool(self.roles & READONLY_ROLES)

    @property
    def is_faculty(self) -> bool:
        return "faculty" in self.roles


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AppError(401, "UNAUTHENTICATED", "Missing bearer access token.")
    return auth_header.removeprefix("Bearer ").strip()


def _parent_context(db: Session, parent_id: int) -> AuthContext:
    """Build a READ-ONLY context for a verified parent.

    Permissions come from the DB (role_permissions for 'parent'), and the
    visible student set is re-derived from student_parent_links on every
    request — never trusted from token claims alone."""
    from app.models.student import Parent, StudentParentLink

    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if parent is None or not parent.is_active or not parent.is_verified:
        raise AppError(401, "INVALID_TOKEN", "Parent session is no longer valid.")

    links = (
        db.query(StudentParentLink.student_id)
        .filter(StudentParentLink.parent_id == parent.id)
        .all()
    )
    linked = frozenset(row[0] for row in links)

    permissions: frozenset[str] = frozenset()
    role = db.query(Role).filter(Role.name == "parent").first()
    if role is not None:
        permissions = frozenset(rp.permission for rp in role.role_permissions)

    return AuthContext(
        user_id=0,  # parents are not `users`; id 0 never matches staff FKs
        email=parent.email or f"parent-{parent.id}@portal.local",
        full_name=parent.full_name,
        roles=frozenset({"parent"}),
        permissions=permissions,
        is_active=True,
        linked_student_ids=linked,
        parent_id=parent.id,
    )


def _user_query(db: Session):
    """User with roles and role permissions eagerly loaded."""
    return (
        db.query(User)
        .options(
            joinedload(User.roles)
            .joinedload(UserRole.role)
            .joinedload(Role.role_permissions)
        )
        .execution_options(joinedload_depth=4)
    )


def load_effective_permissions(user: User) -> frozenset[str]:
    """Union of role_permissions granted to the user's assigned roles."""
    perms: set[str] = set()
    for ur in user.roles:
        for rp in ur.role.role_permissions:
            perms.add(rp.permission)
    return frozenset(perms)


def build_auth_context(db: Session, user: User) -> AuthContext:
    """Compute permissions and scope from DB state only."""
    role_names = frozenset(ur.role.name for ur in user.roles)

    branch_scope: frozenset[int] | None = None
    class_scope: frozenset[int] | None = None
    subject_scope: frozenset[int] | None = None

    if "faculty" in role_names:
        from app.models.academic import FacultyAssignment

        assignments = (
            db.query(FacultyAssignment)
            .options(joinedload(FacultyAssignment.class_section))
            .filter(FacultyAssignment.user_id == user.id)
            .all()
        )
        class_scope = frozenset(a.class_section_id for a in assignments)
        subject_scope = frozenset(a.subject_id for a in assignments)
        branch_scope = frozenset(a.class_section.branch_id for a in assignments)

    return AuthContext(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=role_names,
        permissions=load_effective_permissions(user),
        is_active=user.is_active,
        branch_scope=branch_scope,
        class_scope=class_scope,
        subject_scope=subject_scope,
    )


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AuthContext:
    """Resolve the authenticated principal from the bearer access token."""
    token = _extract_token(request)
    try:
        payload = decode_token(token)
    except pyjwt.ExpiredSignatureError:
        raise AppError(401, "TOKEN_EXPIRED", "Access token has expired.")
    except pyjwt.PyJWTError:
        raise AppError(401, "INVALID_TOKEN", "Access token is invalid.")

    if payload.get("type") != "access":
        raise AppError(401, "INVALID_TOKEN", "Token type not accepted.")

    # --- verified parent session (read-only principal) ---
    sub = str(payload.get("sub", ""))
    if sub.startswith("parent:"):
        try:
            parent_id = int(sub.split(":", 1)[1])
        except (ValueError, IndexError):
            raise AppError(401, "INVALID_TOKEN", "Access token is invalid.")
        ctx = _parent_context(db, parent_id)
        request.state.auth = ctx
        return ctx

    try:
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise AppError(401, "INVALID_TOKEN", "Access token is invalid.")

    user = _user_query(db).filter(User.id == user_id).first()
    if user is None:
        raise AppError(401, "INVALID_TOKEN", "Account no longer exists.")
    if not user.is_active:
        raise AppError(403, "ACCOUNT_DISABLED", "This account has been deactivated.")

    # Read-only principals carry their allowed student ids in the token.
    linked = frozenset(int(s) for s in payload.get("students", []) or [])

    ctx = build_auth_context(db, user)
    if linked:
        ctx = AuthContext(
            user_id=ctx.user_id,
            email=ctx.email,
            full_name=ctx.full_name,
            roles=ctx.roles,
            permissions=ctx.permissions,
            is_active=ctx.is_active,
            branch_scope=ctx.branch_scope,
            class_scope=ctx.class_scope,
            subject_scope=ctx.subject_scope,
            linked_student_ids=linked,
        )
    request.state.auth = ctx
    return ctx


class PermissionChecker:
    """Dependency factory enforcing a permission (and optional role set)."""

    def __init__(self, permission: str, *, any_of: set[str] | None = None) -> None:
        self.permission = permission
        self.any_of = any_of

    def __call__(self, ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        if self.permission not in ctx.permissions:
            # Do not disclose which permissions exist beyond the one required.
            raise AppError(
                403,
                "FORBIDDEN",
                "You do not have permission to perform this action.",
            )
        if self.any_of is not None and not (ctx.roles & self.any_of):
            raise AppError(403, "FORBIDDEN", "Your role cannot perform this action.")
        return ctx


def require_permission(
    permission: str, any_of: set[str] | None = None
) -> PermissionChecker:
    """Usage: `ctx: AuthContext = Depends(require_permission("students:read"))`."""
    return PermissionChecker(permission, any_of=any_of)


class AnyPermissionChecker:
    """Dependency: caller needs AT LEAST ONE of the listed permissions.

    Used where two legitimate paths exist, e.g. normal entry
    (`attendance:write`) vs authorized correction (`attendance:correct`)."""

    def __init__(self, permissions: set[str]) -> None:
        self.permissions = permissions

    def __call__(self, ctx: AuthContext = Depends(get_current_user)) -> AuthContext:
        if not (self.permissions & ctx.permissions):
            raise AppError(
                403,
                "FORBIDDEN",
                "You do not have permission to perform this action.",
            )
        return ctx


def require_any(*permissions: str) -> AnyPermissionChecker:
    """Usage: `Depends(require_any("attendance:write", "attendance:correct"))`."""
    return AnyPermissionChecker(set(permissions))


def can_view_student(db: Session, ctx: AuthContext, student_id: int) -> bool:
    """Record-level authorization for a single student."""
    if ctx.is_readonly_principal:
        return student_id in ctx.linked_student_ids
    if ctx.class_scope is not None:  # faculty: enrolment must be in scope
        from app.models.student import Enrollment

        return (
            db.query(Enrollment.id)
            .filter(
                Enrollment.student_id == student_id,
                Enrollment.class_section_id.in_(list(ctx.class_scope)),
            )
            .first()
            is not None
        )
    return True  # unrestricted staff roles (principal/admin/accounts)


def ensure_student_visible(db: Session, ctx: AuthContext, student_id: int) -> None:
    """Raise 404 (not 403) when invisible — avoids leaking existence."""
    if not can_view_student(db, ctx, student_id):
        raise AppError(404, "NOT_FOUND", "Student record not found.")


__all__ = [
    "AuthContext",
    "PermissionChecker",
    "AnyPermissionChecker",
    "build_auth_context",
    "can_view_student",
    "ensure_student_visible",
    "get_current_user",
    "load_effective_permissions",
    "require_permission",
    "require_any",
    "STAFF_ROLES",
    "READONLY_ROLES",
]
