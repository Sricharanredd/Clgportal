"""Reference-data schemas (branches, years, classes, subjects)."""
from pydantic import BaseModel, Field


class BranchOut(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class AcademicYearOut(BaseModel):
    id: int
    name: str
    is_current: bool

    model_config = {"from_attributes": True}


class ClassSectionOut(BaseModel):
    id: int
    branch_id: int
    academic_year_id: int
    section_name: str
    year_of_study: int
    branch_code: str | None = None
    branch_name: str | None = None

    model_config = {"from_attributes": True}


class SubjectOut(BaseModel):
    id: int
    code: str
    name: str
    branch_id: int

    model_config = {"from_attributes": True}
