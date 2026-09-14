"""Clock service providing centralized base date anchoring for the pipeline.

Ensures fully reproducible timetable materialization and candidate window generation
when DEMO_BASE_DATE is set, while naturally falling back to the real calendar date (today).
"""

import os
from datetime import date, datetime
from typing import Optional


def get_base_date(override_date: Optional[date] = None) -> date:
    """Return the reference base date for timetable materialization and window generation.

    Priority:
    1. Direct override_date parameter if explicitly passed.
    2. DEMO_BASE_DATE environment variable (parsed as YYYY-MM-DD).
    3. Real system calendar date (date.today()).
    """
    if override_date is not None:
        return override_date

    env_date = os.getenv("DEMO_BASE_DATE", "").strip()
    if env_date:
        try:
            return datetime.strptime(env_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    return date.today()

