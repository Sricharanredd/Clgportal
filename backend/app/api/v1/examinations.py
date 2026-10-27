"""Examination endpoints: list, detail/entry sheet, create, save,
publish and reopen (correction path)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.permissions.deps import AuthContext, require_any, require_permission
from app.schemas.examinations import (
    ExaminationCreate,
    ExaminationDetail,
    ExaminationOut,
    PublishResponse,
    SaveResultsRequest,
    SaveResultsResponse,
)
from app.services.examinations import (
    create_examination,
    get_detail,
    list_examinations,
    publish_results,
    reopen_examination,
    save_results,
)

router = APIRouter()


@router.get(
    "",
    response_model=list[ExaminationOut],
    summary="Examinations (branch/class/subject/status filters, scope-applied)",
)
def examinations(
    branch_id: int | None = None,
    class_id: int | None = None,
    subject_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("results:read")),
) -> list[ExaminationOut]:
    return list_examinations(
        db,
        branch_id=branch_id,
        class_id=class_id,
        subject_id=subject_id,
        status=status,
        ctx=ctx,
    )


@router.get(
    "/{exam_id}",
    response_model=ExaminationDetail,
    summary="Entry sheet: roster + marks + editability",
    responses={404: {"description": "Not visible to this account"}},
)
def detail(
    exam_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("results:read")),
) -> ExaminationDetail:
    return get_detail(db, exam_id, ctx)


@router.post(
    "",
    response_model=ExaminationOut,
    status_code=201,
    summary="Create a draft examination (assigned faculty)",
    responses={
        403: {"description": "Not assigned to this class/subject"},
        409: {"description": "Duplicate title"},
        422: {"description": "Invalid marks configuration"},
    },
)
def create(
    body: ExaminationCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_any("results:write", "results:publish")),
) -> ExaminationOut:
    if "results:write" not in ctx.permissions:
        raise AppError(403, "FORBIDDEN", "You do not have permission to enter results.")
    return create_examination(db, body.model_dump(), ctx)


@router.put(
    "/{exam_id}/results",
    response_model=SaveResultsResponse,
    summary="Save marks (draft exams only, validated against max marks)",
    responses={
        403: {"description": "Not assigned / no entry permission"},
        409: {"description": "Published or duplicate"},
        422: {"description": "Marks out of range / not enrolled"},
    },
)
def save(
    exam_id: int,
    body: SaveResultsRequest,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("results:write")),
) -> SaveResultsResponse:
    return save_results(
        db, exam_id, [r.model_dump() for r in body.results], ctx
    )


@router.post(
    "/{exam_id}/publish",
    response_model=PublishResponse,
    summary="Publish results — makes them visible to students/parents",
    responses={403: {"description": "Requires results:publish"},
               409: {"description": "Already published / incomplete entry"}},
)
def publish(
    exam_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("results:publish")),
) -> PublishResponse:
    out = publish_results(db, exam_id, ctx)
    _log(db, ctx, exam_id, "results_published",
         f"Examination #{exam_id} results published")
    return out


@router.post(
    "/{exam_id}/reopen",
    response_model=PublishResponse,
    summary="Reopen published results for authorized correction",
    responses={403: {"description": "Requires results:publish"},
               409: {"description": "Not published"}},
)
def reopen(
    exam_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission("results:publish")),
) -> PublishResponse:
    out = reopen_examination(db, exam_id, ctx)
    _log(db, ctx, exam_id, "results_reopened",
         f"Examination #{exam_id} reopened for correction")
    return out


def _log(db: Session, ctx: AuthContext, exam_id: int, action: str, summary: str) -> None:
    from app.models.content import ActivityLog

    db.add(
        ActivityLog(
            actor_user_id=ctx.user_id,
            action=action,
            entity_type="Examination",
            entity_id=exam_id,
            summary=summary,
        )
    )
    db.commit()


__all__ = ["router"]
