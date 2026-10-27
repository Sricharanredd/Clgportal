"""Consistent API error envelope and exception handlers.

Every error response has the shape:
{"error": {"code": "...", "message": "...", "details": [...], "request_id": "..."}}
"""
import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("cmp.error")

# Never leak internals: map HTTP codes to safe default codes/messages.
_HTTP_ERROR_MAP: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "The request could not be processed."),
    401: ("UNAUTHENTICATED", "Authentication is required."),
    403: ("FORBIDDEN", "You do not have permission to perform this action."),
    404: ("NOT_FOUND", "The requested resource was not found."),
    405: ("METHOD_NOT_ALLOWED", "HTTP method not allowed for this resource."),
    409: ("CONFLICT", "The request conflicts with the current state."),
    429: ("RATE_LIMITED", "Too many requests. Please try again later."),
    500: ("INTERNAL_ERROR", "An unexpected error occurred."),
}


class AppError(Exception):
    """Domain error raised by services/permissions with a safe message."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


def error_body(
    code: str, message: str, details: list[Any] | None = None, request_id: str = ""
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "request_id": request_id,
        }
    }


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid.uuid4())[:12])


def _json(
    request: Request, status: int, code: str, message: str, details: list | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=error_body(code, message, details, _request_id(request)),
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return _json(request, exc.status_code, exc.code, exc.message, exc.details)


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code, default_msg = _HTTP_ERROR_MAP.get(
        exc.status_code, ("ERROR", "Request failed.")
    )
    message = exc.detail if isinstance(exc.detail, str) else default_msg
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return _json(
            request,
            exc.status_code,
            exc.detail.get("code", code),
            exc.detail.get("message", default_msg),
            exc.detail.get("details"),
        )
    return _json(request, exc.status_code, code, message)


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(p) for p in err.get("loc", []) if p != "body"),
            "message": err.get("msg", "Invalid value"),
        }
        for err in exc.errors()
    ]
    return _json(
        request,
        422,
        "VALIDATION_ERROR",
        "One or more fields are invalid.",
        details,
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return _json(request, 500, "INTERNAL_ERROR", "An unexpected error occurred.")


def install_error_handlers(app: FastAPI) -> None:
    """Attach all error handlers to the FastAPI application."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
