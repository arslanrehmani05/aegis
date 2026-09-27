from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from packages.storage.database import get_db
from packages.storage.db_models import ApprovalModel, RunModel
from packages.storage.redis_client import enqueue_run_job
from packages.domain.models import Approval
from packages.domain.enums import ApprovalStatus, RunStatus

router = APIRouter(prefix="/v1/approvals", tags=["Approvals"])

class ApprovalDecisionRequest(BaseModel):
    decision_by: str

@router.get("", response_model=List[Approval])
async def list_approvals(status_filter: Optional[ApprovalStatus] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(ApprovalModel)
    if status_filter:
        stmt = stmt.where(ApprovalModel.status == status_filter.value)
    res = await db.execute(stmt)
    approvals = res.scalars().all()
    return [Approval.model_validate(a) for a in approvals]

@router.post("/{approval_id}/approve", response_model=Approval)
async def approve_step(approval_id: UUID, payload: ApprovalDecisionRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(ApprovalModel).where(ApprovalModel.id == approval_id)
    res = await db.execute(stmt)
    approval = res.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    approval.status = ApprovalStatus.APPROVED.value
    approval.decision_by = payload.decision_by
    approval.decided_at = datetime.utcnow()

    # Resume the associated run
    run_stmt = select(RunModel).where(RunModel.id == approval.run_id)
    run_res = await db.execute(run_stmt)
    run = run_res.scalar_one_or_none()
    if run:
        run.status = RunStatus.QUEUED.value
        await enqueue_run_job(str(run.id))

    await db.commit()
    await db.refresh(approval)
    return Approval.model_validate(approval)

@router.post("/{approval_id}/reject", response_model=Approval)
async def reject_step(approval_id: UUID, payload: ApprovalDecisionRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(ApprovalModel).where(ApprovalModel.id == approval_id)
    res = await db.execute(stmt)
    approval = res.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    approval.status = ApprovalStatus.REJECTED.value
    approval.decision_by = payload.decision_by
    approval.decided_at = datetime.utcnow()

    # Mark associated run as FAILED
    run_stmt = select(RunModel).where(RunModel.id == approval.run_id)
    run_res = await db.execute(run_stmt)
    run = run_res.scalar_one_or_none()
    if run:
        run.status = RunStatus.FAILED.value
        run.failure_reason = f"Human operator '{payload.decision_by}' rejected execution step."

    await db.commit()
    await db.refresh(approval)
    return Approval.model_validate(approval)
