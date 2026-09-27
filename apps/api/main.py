from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from packages.storage.database import engine, Base
from packages.observability.logger import setup_logging, get_logger
from packages.storage.config import settings
from apps.api.routers import agents, runs, tools, approvals

setup_logging(settings.LOG_LEVEL)
logger = get_logger("aegis.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Aegis API gateway and database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")
    yield
    logger.info("Shutting down Aegis API gateway...")

app = FastAPI(
    title="Aegis AI Agent Runtime",
    version="0.1.0",
    description="Durable execution runtime platform for AI agents and business workflows",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include routers
app.include_router(agents.router)
app.include_router(runs.router)
app.include_router(tools.router)
app.include_router(approvals.router)

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "aegis-api", "environment": settings.ENVIRONMENT}
