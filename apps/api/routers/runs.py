from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from packages.storage.database import get_db
from packages.storage.db_models import RunModel, AgentVersionModel, AgentModel
from packages.storage.redis_client import enqueue_run_job
from packages.domain.models import Run
from packages.domain.enums import RunStatus
from packages.orchestration.state_machine import RunStateMachine

router = APIRouter(prefix="/v1", tags=["Runs"])

class CreateRunRequest(BaseModel):
    tenant_id: UUID
    input: dict
    version_id: Optional[UUID] = None

@router.post("/agents/{agent_id}/runs", response_model=Run, status_code=status.HTTP_201_CREATED)
async def submit_run(agent_id: UUID, payload: CreateRunRequest, db: AsyncSession = Depends(get_db)):
    version_id = payload.version_id
    if not version_id:
        # Fetch active version from agent
        stmt = select(AgentModel).where(AgentModel.id == agent_id)
        res = await db.execute(stmt)
        agent = res.scalar_one_or_none()
        if not agent or not agent.active_version_id:
            raise HTTPException(status_code=400, detail="Agent does not have an active published version.")
        version_id = agent.active_version_id

    run_model = RunModel(
        tenant_id=payload.tenant_id,
        agent_version_id=version_id,
        status=RunStatus.QUEUED.value,
        input=payload.input,
    )
    db.add(run_model)
    await db.commit()
    await db.refresh(run_model)

    # Enqueue task for background workers
    await enqueue_run_job(str(run_model.id))

    return Run.model_validate(run_model)

@router.get("/runs", response_model=List[Run])
async def list_runs(tenant_id: Optional[UUID] = None, status_filter: Optional[RunStatus] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(RunModel)
    if tenant_id:
        stmt = stmt.where(RunModel.tenant_id == tenant_id)
    if status_filter:
        stmt = stmt.where(RunModel.status == status_filter.value)
    result = await db.execute(stmt)
    runs = result.scalars().all()
    return [Run.model_validate(r) for r in runs]

@router.get("/runs/{run_id}", response_model=Run)
async def get_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(RunModel).where(RunModel.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return Run.model_validate(run)

@router.post("/runs/{run_id}/cancel", response_model=Run)
async def cancel_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(RunModel).where(RunModel.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    sm = RunStateMachine(RunStatus(run.status))
    if not sm.can_transition_to(RunStatus.CANCELLED):
        raise HTTPException(status_code=400, detail=f"Cannot cancel run in state {run.status}")

    run.status = RunStatus.CANCELLED.value
    await db.commit()
    await db.refresh(run)
    return Run.model_validate(run)

@router.post("/runs/{run_id}/resume", response_model=Run)
async def resume_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(RunModel).where(RunModel.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run.status = RunStatus.QUEUED.value
    await db.commit()
    await db.refresh(run)
    await enqueue_run_job(str(run.id))
    return Run.model_validate(run)
