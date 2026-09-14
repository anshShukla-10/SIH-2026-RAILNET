"""Maintenance jobs endpoints across TMS, SMMS, and TDMS departments."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from prisma import Prisma

from api.db import get_db
from api.schemas import MaintenanceJobOut

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
        )
        for j in jobs
    ]

