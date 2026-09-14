"""Maintenance block scheduling and explainability endpoints."""

from fastapi import APIRouter, Depends
from prisma import Prisma

from api.db import get_db
from api.exceptions import NotFoundError
from api.schemas import BlockExplainOut, BenchmarkReportOut
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
        reason=opt_res.reason,
    )

