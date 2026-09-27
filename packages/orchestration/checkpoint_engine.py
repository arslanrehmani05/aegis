from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from packages.storage.db_models import CheckpointModel
from packages.domain.models import Checkpoint

class CheckpointEngine:
    @staticmethod
    async def create_checkpoint(
        session: AsyncSession,
        run_id: UUID,
        step_number: int,
        state_snapshot: Dict[str, Any],
    ) -> Checkpoint:
        model = CheckpointModel(
            run_id=run_id,
            step_number=step_number,
            state_snapshot=state_snapshot,
        )
        session.add(model)
        await session.commit()
        await session.refresh(model)
        return Checkpoint.model_validate(model)

    @staticmethod
    async def get_latest_checkpoint(
        session: AsyncSession,
        run_id: UUID,
    ) -> Optional[Checkpoint]:
        stmt = (
            select(CheckpointModel)
            .where(CheckpointModel.run_id == run_id)
            .order_by(CheckpointModel.step_number.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            return Checkpoint.model_validate(model)
        return None
