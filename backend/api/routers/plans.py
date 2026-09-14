"""Multi-horizon rolling maintenance block planning endpoints (FR7.1, FR7.2)."""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from prisma import Prisma

from api.db import get_db
from api.schemas import PlanItemOut

router = APIRouter(prefix="/api/plans", tags=["Plans"])


async def _get_plan_items(
    days: int,
    db: Prisma,
) -> List[PlanItemOut]:
    """Helper querying scheduled blocks within the specified day window."""
    # Find all scheduled blocks with linked jobs
    blocks = await db.block.find_many(
        where={"status": "SCHEDULED"},
        include={"job": True},
        order={"start": "asc"},
    )

    if not blocks:
        return []

    # Window cutoff relative to earliest scheduled block
    base_time = min(b.start for b in blocks)
    cutoff_time = base_time + timedelta(days=days)

    filtered_blocks = [b for b in blocks if b.start <= cutoff_time]

    # Pre-fetch optimization results to avoid N+1 queries
    job_ids = [b.job_id for b in filtered_blocks]
    opt_results = await db.optimizationresult.find_many(
        where={"job_id": {"in": job_ids}}
    )
    opt_map = {r.job_id: r for r in opt_results}

    items = []
    for b in filtered_blocks:
        opt = opt_map.get(b.job_id)
        reason = opt.reason if opt else "Scheduled maintenance block"
        conflict_count = opt.conflict_count if opt else 0
        priority_score = opt.priority_score if opt else (b.job.priority_score or 0.0)

        duration_min = b.job.duration_min if b.job else int((b.end - b.start).total_seconds() // 60)
        dept = b.job.department if b.job else "TMS"

        items.append(
            PlanItemOut(
                block_id=b.block_id,
                job_id=b.job_id,
                section_id=b.section_id,
                department=dept,
                priority_score=priority_score,
                start=b.start,
                end=b.end,
                duration_min=duration_min,
                conflict_count=conflict_count,
                status=b.status,
                has_hard_conflict=b.has_hard_conflict,
                reason=reason,
            )
        )

    return items


@router.get("/weekly", response_model=List[PlanItemOut])
async def get_weekly_plan(
    db: Prisma = Depends(get_db),
) -> List[PlanItemOut]:
    """7-day rolling maintenance block plan (FR7.1).

    Resolves already-scheduled blocks and optimization results across the coming 7 days.
    If no jobs have been scheduled yet, returns an empty list.
    """
    return await _get_plan_items(days=7, db=db)


@router.get("/monthly", response_model=List[PlanItemOut])
async def get_monthly_plan(
    db: Prisma = Depends(get_db),
) -> List[PlanItemOut]:
    """30-day maintenance block plan (FR7.2).

    Resolves scheduled blocks across a 30-day planning window.
    Note: Simplified stand-in for true rolling-horizon planning, per PRD Section 7 (FR7.2) and Section 13 caveat.
    """
    return await _get_plan_items(days=30, db=db)

