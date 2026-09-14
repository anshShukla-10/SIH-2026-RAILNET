"""Priority scoring service for maintenance jobs (FR2).

Pure weighted scoring model for ranking maintenance jobs by criticality,
urgency, asset risk, overdue factor, and failure history.
"""

from typing import Any, Dict, Optional
from prisma import Prisma

# Configurable weights for transparent priority scoring model (FR2.1, FR2.2)
# Sum of weights = 1.00
WEIGHTS = {
    "criticality": 0.30,
    "urgency": 0.25,
    "asset_risk": 0.20,
    "overdue_factor": 0.15,
    "failure_history": 0.10,
}


def calculate_priority_score(job: Dict[str, Any]) -> float:
    """Calculate transparent priority score for a maintenance job.

    Formula:
      priority_score = (
          0.30 * criticality +
          0.25 * urgency +
          0.20 * asset_risk +
          0.15 * overdue_factor +
          0.10 * failure_history
      )

    This is a pure function: zero database access, completely deterministic
    and independently testable.
    """
    criticality = float(job.get("criticality") or 0.0)
    urgency = float(job.get("urgency") or 0.0)
    asset_risk = float(job.get("asset_risk") or 0.0)
    overdue_factor = float(job.get("overdue_factor") or 0.0)
    failure_history = float(job.get("failure_history") or 0.0)

    score = (
        WEIGHTS["criticality"] * criticality
        + WEIGHTS["urgency"] * urgency
        + WEIGHTS["asset_risk"] * asset_risk
        + WEIGHTS["overdue_factor"] * overdue_factor
        + WEIGHTS["failure_history"] * failure_history
    )

    # Clamp to [0.0, 100.0] and round to 2 decimal places
    clamped = max(0.0, min(100.0, score))
    return round(clamped, 2)


async def update_all_priority_scores(db: Optional[Prisma] = None) -> int:
    """Compute and persist priority scores for all MaintenanceJob rows in the database.

    This is the only function in this service that interacts with PostgreSQL.
    Returns the number of updated records.
    """
    should_disconnect = False
    if db is None:
        db = Prisma()
        await db.connect()
        should_disconnect = True

    try:
        jobs = await db.maintenancejob.find_many()
        updated_count = 0
        for job in jobs:
            job_dict = {
                "criticality": job.criticality,
                "urgency": job.urgency,
                "asset_risk": job.asset_risk,
                "overdue_factor": job.overdue_factor,
                "failure_history": job.failure_history,
            }
            score = calculate_priority_score(job_dict)
            await db.maintenancejob.update(
                where={"job_id": job.job_id},
                data={"priority_score": score},
            )
            updated_count += 1
        return updated_count
    finally:
        if should_disconnect:
            await db.disconnect()

