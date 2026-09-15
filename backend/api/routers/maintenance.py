"""Maintenance jobs endpoints across TMS, SMMS, and TDMS departments."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from prisma import Prisma

from api.db import get_db
from api.schemas import MaintenanceJobOut
from api.schemas import MaintenanceJobCreateIn, MaintenanceJobOut

router = APIRouter(prefix="/api/maintenance-jobs", tags=["Maintenance Jobs"])

VALID_DEPARTMENTS = {"TMS", "SMMS", "TDMS"}


@router.get("", response_model=List[MaintenanceJobOut])
async def list_maintenance_jobs(
    department: Optional[str] = Query(
        None,
        description="Filter by department: TMS, SMMS, or TDMS",
    ),
    db: Prisma = Depends(get_db),
) -> List[MaintenanceJobOut]:
    """List maintenance jobs, with optional department filtering."""
    where_clause = {}
    if department is not None:
        dept_clean = department.strip().upper()
        if dept_clean not in VALID_DEPARTMENTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid department '{department}'. Must be one of: {', '.join(sorted(VALID_DEPARTMENTS))}",
            )
        where_clause["department"] = dept_clean

    jobs = await db.maintenancejob.find_many(
        where=where_clause,
        order={"priority_score": "desc"},
        include={"blocks": True},
    )

    return [
        MaintenanceJobOut(
            job_id=j.job_id,
            department=j.department,
            asset_id=j.asset_id,
            section_id=j.section_id,
            defect_desc=j.defect_desc,
            criticality=j.criticality,
            urgency=j.urgency,
            asset_risk=j.asset_risk,
            overdue_factor=j.overdue_factor,
            failure_history=j.failure_history,
            priority_score=j.priority_score,
            due_date=j.due_date,
            duration_min=j.duration_min,
            day_night_pref=j.day_night_pref,
            status=j.status,
            is_synthetic=j.is_synthetic,
            source_note=j.source_note,
            has_hard_conflict=j.has_hard_conflict,
            is_locked=bool(j.blocks and any(b.is_locked for b in j.blocks)),
        )
        for j in jobs
    ]


@router.post("", response_model=MaintenanceJobOut, status_code=status.HTTP_201_CREATED)
async def create_maintenance_job(
    payload: MaintenanceJobCreateIn,
    db: Prisma = Depends(get_db),
) -> MaintenanceJobOut:
    """Manually create a new maintenance job via the API."""
    from datetime import datetime
    from api.exceptions import NotFoundError
    from api.schemas import MaintenanceJobCreateIn
    from services.priority import calculate_priority_score

    dept_clean = payload.department.strip().upper()
    if dept_clean not in VALID_DEPARTMENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid department '{payload.department}'. Must be one of: {', '.join(sorted(VALID_DEPARTMENTS))}",
        )

    pref_clean = payload.day_night_pref.strip().upper()
    if pref_clean not in {"DAY", "NIGHT", "ANY"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day_night_pref '{payload.day_night_pref}'. Must be DAY, NIGHT, or ANY.",
        )

    # Validate section_id exists
    section = await db.section.find_unique(where={"section_id": payload.section_id})
    if not section:
        raise NotFoundError(f"Section with id '{payload.section_id}' was not found.")

    # Generate sequence-based job_id: JOB-{DEPT}-{seq:04d}
    existing_dept_jobs = await db.maintenancejob.find_many(
        where={"department": dept_clean},
    )
    max_seq = 0
    for ej in existing_dept_jobs:
        parts = ej.job_id.split("-")
        if len(parts) >= 3 and parts[-1].isdigit():
            max_seq = max(max_seq, int(parts[-1]))
    next_seq = max_seq + 1
    job_id = f"JOB-{dept_clean}-{next_seq:04d}"

    # Calculate transparent priority score immediately
    score_data = {
        "criticality": payload.criticality,
        "urgency": payload.urgency,
        "asset_risk": payload.asset_risk,
        "overdue_factor": payload.overdue_factor,
        "failure_history": payload.failure_history,
    }
    priority_score = round(calculate_priority_score(score_data), 2)
    due_datetime = datetime.combine(payload.due_date, datetime.min.time())

    created_job = await db.maintenancejob.create(
        data={
            "job_id": job_id,
            "department": dept_clean,
            "asset_id": payload.asset_id,
            "section_id": payload.section_id,
            "defect_desc": payload.defect_desc,
            "criticality": float(payload.criticality),
            "urgency": float(payload.urgency),
            "asset_risk": float(payload.asset_risk),
            "overdue_factor": float(payload.overdue_factor),
            "failure_history": float(payload.failure_history),
            "priority_score": priority_score,
            "due_date": due_datetime,
            "duration_min": int(payload.duration_min),
            "day_night_pref": pref_clean,
            "status": "PENDING",
            "is_synthetic": False,
            "source_note": "Manually entered via API",
            "has_hard_conflict": False,
        }
    )

    return MaintenanceJobOut(
        job_id=created_job.job_id,
        department=created_job.department,
        asset_id=created_job.asset_id,
        section_id=created_job.section_id,
        defect_desc=created_job.defect_desc,
        criticality=created_job.criticality,
        urgency=created_job.urgency,
        asset_risk=created_job.asset_risk,
        overdue_factor=created_job.overdue_factor,
        failure_history=created_job.failure_history,
        priority_score=created_job.priority_score,
        due_date=created_job.due_date,
        duration_min=created_job.duration_min,
        day_night_pref=created_job.day_night_pref,
        status=created_job.status,
        is_synthetic=created_job.is_synthetic,
        source_note=created_job.source_note,
        has_hard_conflict=created_job.has_hard_conflict,
    )

