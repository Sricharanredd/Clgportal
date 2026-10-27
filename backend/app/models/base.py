"""Declarative model mixins shared by all entities."""
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """created_at / updated_at maintained by the database."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftActiveMixin:
    """Explicit activation flag — records are deactivated, not deleted,
    when they are referenced by academic or financial history."""

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
