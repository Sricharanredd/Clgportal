"""Shared API schemas: pagination envelope, messages and audit DTOs."""
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Standard list-response envelope used by every paginated endpoint."""

    items: list[T]
    page: int = 1
    page_size: int = 20
    total: int = 0
    pages: int = 0


class PaginationParams(BaseModel):
    """Default pagination constraints (router-level Query uses same bounds)."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class Message(BaseModel):
    """Simple acknowledgement payload."""

    message: str
