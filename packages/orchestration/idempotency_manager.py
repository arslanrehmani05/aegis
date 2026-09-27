import hashlib
import json
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from packages.storage.db_models import ToolExecutionModel
from packages.domain.enums import ToolExecutionStatus
from packages.domain.models import ToolExecution

class IdempotencyManager:
    @staticmethod
    def generate_key(run_id: UUID, step_id: str, semantic_payload: Dict[str, Any]) -> str:
        raw_str = f"{run_id}:{step_id}:{json.dumps(semantic_payload, sort_keys=True)}"
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    @staticmethod
    async def get_execution(session: AsyncSession, idempotency_key: str) -> Optional[ToolExecution]:
        stmt = select(ToolExecutionModel).where(ToolExecutionModel.idempotency_key == idempotency_key)
        result = await session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            return ToolExecution.model_validate(model)
        return None

    @staticmethod
    async def record_start(
        session: AsyncSession,
        run_id: UUID,
        tool_name: str,
        idempotency_key: str,
        input_data: Dict[str, Any],
    ) -> ToolExecution:
        model = ToolExecutionModel(
            run_id=run_id,
            tool_name=tool_name,
            idempotency_key=idempotency_key,
            status=ToolExecutionStatus.EXECUTING.value,
            input=input_data,
        )
        session.add(model)
        await session.commit()
        await session.refresh(model)
        return ToolExecution.model_validate(model)

    @staticmethod
    async def record_completion(
        session: AsyncSession,
        idempotency_key: str,
        output_data: Dict[str, Any],
    ) -> Optional[ToolExecution]:
        stmt = select(ToolExecutionModel).where(ToolExecutionModel.idempotency_key == idempotency_key)
        result = await session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.status = ToolExecutionStatus.COMPLETED.value
            model.output = output_data
            await session.commit()
            await session.refresh(model)
            return ToolExecution.model_validate(model)
        return None
