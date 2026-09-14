"""RAILNET-AI FastAPI Application.

Entry point for the REST API layer specified in PRD Section 8.
Exposes endpoints for trains, sections, maintenance jobs, blocks/optimizer, and planning horizons.
"""

from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.db import db
from api.exceptions import NotFoundError
from api.routers import blocks, maintenance, plans, sections, trains


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle across application lifespan."""
    if not db.is_connected():
        await db.connect()
    yield
    if db.is_connected():
        await db.disconnect()


app = FastAPI(
    title="RAILNET-AI API",
    description=(
        "AI-Powered Automatic Block Planning System for Indian Railways.\n"
        "Smart India Hackathon 2026 (SIH26027) · Ministry of Railways."
    ),
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Centralized exception handler for resource not found conditions."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.detail},
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Health check endpoint confirming API availability."""
    return {"status": "ok"}


# Include API routers matching PRD Section 8 specification
app.include_router(trains.router)
app.include_router(sections.router)
app.include_router(maintenance.router)
app.include_router(blocks.router)
app.include_router(plans.router)

