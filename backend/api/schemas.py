"""Pydantic schemas and response models matching PRD Section 6 data models."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class TrainStopOut(BaseModel):
    """Pydantic model for TrainStop."""

    id: int
    train_id: str
    station_code: str
    section_id: str
    sequence: int
    arrival: datetime
    departure: datetime

    model_config = ConfigDict(from_attributes=True)


class TrainOut(BaseModel):
    """Pydantic model for Train."""

    train_id: str
    name: str
    source: str
    destination: str
    run_days: str
    stops: Optional[List[TrainStopOut]] = None

    model_config = ConfigDict(from_attributes=True)


class SectionOut(BaseModel):
    """Pydantic model for Section."""

    section_id: str
    name: str
    single_line: bool

    model_config = ConfigDict(from_attributes=True)


class MaintenanceJobOut(BaseModel):
    """Pydantic model for MaintenanceJob."""

    job_id: str
    department: str
    asset_id: str
    section_id: str
    defect_desc: str
    criticality: float
    urgency: float
    asset_risk: float
    overdue_factor: float
    failure_history: float
    priority_score: Optional[float] = 0.0
    due_date: date
    duration_min: int
    day_night_pref: str
    status: str
    is_synthetic: bool
    source_note: str
    has_hard_conflict: bool = False

    model_config = ConfigDict(from_attributes=True)


class BlockOut(BaseModel):
    """Pydantic model for Block."""

    block_id: str
    job_id: str
    section_id: str
    start: datetime
    end: datetime
    status: str
    has_hard_conflict: bool = False

    model_config = ConfigDict(from_attributes=True)


class OptimizationResultOut(BaseModel):
    """Pydantic model for OptimizationResult."""

    id: int
    job_id: str
    recommended_start: datetime
    recommended_end: datetime
    conflict_count: int
    priority_score: float
    reason: str

    model_config = ConfigDict(from_attributes=True)


class BlockExplainOut(BaseModel):
    """Structured explainability response for a scheduled block (FR6.1)."""

    block_id: str
    job_id: str
    section_id: str
    start: datetime
    end: datetime
    status: str
    priority_score: float
    priority_rank: int
    total_jobs: int
    conflict_count: int
    hard_conflict: bool
    relaxed: bool
    reason: str


class PlanItemOut(BaseModel):
    """Single item in a multi-horizon rolling block plan."""

    block_id: str
    job_id: str
    section_id: str
    department: str
    priority_score: float
    start: datetime
    end: datetime
    duration_min: int
    conflict_count: int
    status: str
    has_hard_conflict: bool
    reason: str


from services.benchmark import (  # noqa: E402
    BenchmarkReport as BenchmarkReportOut,
    BenchmarkComparison,
    CriticalDelayDetail,
    ImprovementMetrics,
    ScheduleMetrics,
)

