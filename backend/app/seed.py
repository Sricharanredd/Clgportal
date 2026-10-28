"""Demo data initialization process.

Usage (from backend/):
    python -m app.seed            # seed if empty; always refresh staff/reference
    python -m app.seed --reset    # WIPE all data, then seed fresh

Produces ONLY synthetic records. Demo staff logins (password `Demo@1234`):
    principal@demo.edu | admin@demo.edu | accounts@demo.edu
    faculty.mpc@demo.edu  | faculty.bipc@demo.edu        (whole branch)
    faculty.mpc1@demo.edu | faculty.mpc2@demo.edu        (MPC I / II year)
    faculty.bipc1@demo.edu | faculty.bipc2@demo.edu      (BiPC I / II year)
    faculty.cec1@demo.edu | faculty.cec2@demo.edu        (CEC I / II year)
Parent lookup: any synthetic roll number (e.g. MPC25001) with access
code `DEMO-<roll>`.

The reference/staff step (`seed_reference`) is fully idempotent — every row
is get-or-create by its natural key — so it runs on EVERY invocation. That
lets an already-seeded database gain new demo staff/accounts (and their
faculty assignments) without a wipe, while repeated runs never duplicate
rows. Synthetic student/attendance/exam/fee data is only written when the
database is empty or `--reset` is used.
"""
from __future__ import annotations

import argparse
import logging
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.seeding.academics import seed_attendance, seed_examinations, seed_students
from app.seeding.finance import seed_content, seed_finance
from app.seeding.reference import DEMO_PASSWORD, seed_reference

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s"
)
logger = logging.getLogger("cmp.seed")


def _wipe(db: Session) -> None:
    """Delete all rows (child→parent order) without dropping the schema."""
    from sqlalchemy import text

    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    db.commit()
    logger.warning("All application data wiped")


def run(reset: bool = False) -> None:
    db: Session = SessionLocal()
    try:
        if reset:
            _wipe(db)
        already_seeded = bool(
            db.execute(text("SELECT 1 FROM roles LIMIT 1")).first()
        )

        # Reference/staff upsert runs ALWAYS (idempotent by natural key) so
        # existing databases pick up newly added demo staff + assignments
        # without a wipe, and repeated runs never create duplicates.
        ref = seed_reference(db)

        if already_seeded and not reset:
            logger.info(
                "Database already seeded — staff/reference refreshed "
                "(students/attendance/exams untouched). Use --reset to re-seed."
            )
            return

        students = seed_students(db, ref)
        seed_attendance(db, ref, students)
        seed_examinations(db, ref, students)
        seed_finance(db, ref, students)
        seed_content(db, ref)
        logger.info("Seed complete. Demo staff password: %s", DEMO_PASSWORD)
    finally:
        db.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed synthetic demo data")
    parser.add_argument("--reset", action="store_true", help="wipe data first")
    args = parser.parse_args(argv)
    # Fail fast with a safe message if the DB is unreachable.
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as exc:  # pragma: no cover
        logger.error("Cannot connect to database: %s", exc)
        return 1
    run(reset=args.reset)
    return 0


if __name__ == "__main__":
    sys.exit(main())
