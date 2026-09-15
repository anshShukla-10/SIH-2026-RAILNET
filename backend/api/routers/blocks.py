"""Maintenance block scheduling and explainability endpoints."""

from fastapi import APIRouter, Depends
from prisma import Prisma

from api.db import get_db
from api.exceptions import NotFoundError
from api.schemas import BlockExplainOut, BenchmarkReportOut
from api.schemas import (
    BlockExplainOut,
    BenchmarkReportOut,
    BlockPinIn,
    BlockPinOut,
    BlockUnpinOut,
    ConflictCheckIn,
    ConflictCheckOut,
)
from optimization.solver import OptimizerRunSummary, run_optimizer_and_persist
from services.benchmark import run_baseline_comparison

router = APIRouter(prefix="/api/blocks", tags=["Blocks & Optimization"])


@router.post("/optimize", response_model=OptimizerRunSummary)
async def optimize_blocks(
    db: Prisma = Depends(get_db),
) -> OptimizerRunSummary:
    """Run CP-SAT optimizer over pending maintenance jobs and persist block schedules."""
    summary = await run_optimizer_and_persist(db=db)
    return summary


@router.get("/benchmark", response_model=BenchmarkReportOut)
async def get_benchmark_report(
    db: Prisma = Depends(get_db),
) -> BenchmarkReportOut:
    """Compare CP-SAT against FCFS and EDD baselines without mutating blocks (PRD Section 13)."""
    return await run_baseline_comparison(db=db)


@router.get("/{id}/explain", response_model=BlockExplainOut)
async def explain_block(
    id: str,
    db: Prisma = Depends(get_db),
) -> BlockExplainOut:
    """Structured explainability for a scheduled maintenance block (FR6.1)."""
    block = await db.block.find_unique(
        where={"block_id": id},
        include={"job": True},
    )
    if not block:
        block = await db.block.find_first(
            where={"OR": [{"job_id": id}, {"block_id": f"BLK-{id}"}]},
            include={"job": True},
        )
    if not block:
        raise NotFoundError(f"Block with id '{id}' was not found.")

    opt_res = await db.optimizationresult.find_first(
        where={"job_id": block.job_id},
    )
    if not opt_res:
        raise NotFoundError(f"No optimization result found for block '{id}'.")

    # Compute ranking among all jobs ordered by priority_score
    jobs = await db.maintenancejob.find_many(
        order={"priority_score": "desc"},
    )
    total_jobs = len(jobs)
    priority_rank = next((idx + 1 for idx, j in enumerate(jobs) if j.job_id == block.job_id), 1)

    return BlockExplainOut(
        block_id=block.block_id,
        job_id=block.job_id,
        section_id=block.section_id,
        start=block.start,
        end=block.end,
        status=block.status,
        priority_score=opt_res.priority_score,
        priority_rank=priority_rank,
        total_jobs=total_jobs,
        conflict_count=opt_res.conflict_count,
        hard_conflict=block.has_hard_conflict,
        relaxed="relaxed" in opt_res.reason.lower(),
        is_locked=block.is_locked,
        reason=opt_res.reason,
    )


@router.post("/{job_id}/check-conflict", response_model=ConflictCheckOut)
async def check_window_conflict(
    job_id: str,
    payload: ConflictCheckIn,
    db: Prisma = Depends(get_db),
) -> ConflictCheckOut:
    """Pre-check train timetable conflicts for a candidate override window before pinning."""
    from services.conflict import find_conflicts

    job = await db.maintenancejob.find_unique(where={"job_id": job_id})
    if not job:
        raise NotFoundError(f"Maintenance job with id '{job_id}' was not found.")

    conflict_res = await find_conflicts(job.section_id, payload.start, payload.end, db=db)
    train_ids = [c.train_id for c in conflict_res.conflicts]
    return ConflictCheckOut(
        section_id=job.section_id,
        start=payload.start,
        end=payload.end,
        conflict_count=conflict_res.conflict_count,
        conflicting_trains=train_ids,
    )


@router.post("/{job_id}/pin", response_model=BlockPinOut)
async def pin_block(
    job_id: str,
    payload: BlockPinIn,
    db: Prisma = Depends(get_db),
) -> BlockPinOut:
    """Manually pin a maintenance job to an exact time window (operator schedule override)."""
    from api.schemas import BlockPinIn, BlockPinOut
    from services.conflict import find_conflicts

    job = await db.maintenancejob.find_unique(where={"job_id": job_id})
    if not job:
        raise NotFoundError(f"Maintenance job with id '{job_id}' was not found.")

    # Calculate train conflicts for requested window
    conflict_res = await find_conflicts(job.section_id, payload.start, payload.end, db=db)
    conflict_count = conflict_res.conflict_count
    has_hard_conflict = bool(conflict_count > 0)

    block_id = f"BLK-{job_id}"
    block = await db.block.upsert(
        where={"block_id": block_id},
        data={
            "create": {
                "block_id": block_id,
                "job_id": job.job_id,
                "section_id": job.section_id,
                "start": payload.start,
                "end": payload.end,
                "status": "GRANTED",
                "is_locked": True,
                "has_hard_conflict": has_hard_conflict,
            },
            "update": {
                "section_id": job.section_id,
                "start": payload.start,
                "end": payload.end,
                "status": "GRANTED",
                "is_locked": True,
                "has_hard_conflict": has_hard_conflict,
            },
        },
    )

    await db.maintenancejob.update(
        where={"job_id": job.job_id},
        data={
            "status": "GRANTED",
            "has_hard_conflict": has_hard_conflict,
        },
    )

    reason = f"Manually pinned by operator — not assigned by CP-SAT. {conflict_count} train conflict(s) at this window."
    await db.optimizationresult.delete_many(where={"job_id": job.job_id})
    await db.optimizationresult.create(
        data={
            "job_id": job.job_id,
            "recommended_start": payload.start,
            "recommended_end": payload.end,
            "conflict_count": conflict_count,
            "priority_score": job.priority_score or 0.0,
            "reason": reason,
        }
    )

    return BlockPinOut(
        block_id=block.block_id,
        job_id=block.job_id,
        section_id=block.section_id,
        start=block.start,
        end=block.end,
        status=block.status,
        is_locked=block.is_locked,
        has_hard_conflict=block.has_hard_conflict,
        conflict_count=conflict_count,
        reason=reason,
    )


@router.post("/{job_id}/unpin", response_model=BlockUnpinOut)
@router.delete("/{job_id}/pin", response_model=BlockUnpinOut)
async def unpin_block(
    job_id: str,
    db: Prisma = Depends(get_db),
) -> BlockUnpinOut:
    """Unpin a locked maintenance job, reverting it to PENDING and clearing fixed block schedule."""
    from api.schemas import BlockUnpinOut

    job = await db.maintenancejob.find_unique(where={"job_id": job_id})
    if not job:
        raise NotFoundError(f"Maintenance job with id '{job_id}' was not found.")

    await db.block.delete_many(where={"job_id": job.job_id})
    await db.optimizationresult.delete_many(where={"job_id": job.job_id})
    await db.maintenancejob.update(
        where={"job_id": job.job_id},
        data={
            "status": "PENDING",
            "has_hard_conflict": False,
        },
    )

    return BlockUnpinOut(
        job_id=job.job_id,
        status="PENDING",
        is_locked=False,
        message=f"Job {job.job_id} successfully unpinned and reverted to PENDING.",
    )

