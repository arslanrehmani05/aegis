from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from packages.domain.enums import EventType
from packages.domain.models import Event
from packages.storage.db_models import EventModel
from packages.storage.redis_client import get_redis_client
import json

class EventBus:
    @staticmethod
    async def publish_event(
        session: AsyncSession,
        tenant_id: UUID,
        event_type: EventType,
        payload: Dict[str, Any],
        run_id: Optional[UUID] = None,
    ) -> Event:
        # Record event in PostgreSQL audit trail
        model = EventModel(
            tenant_id=tenant_id,
            run_id=run_id,
            event_type=event_type.value,
            payload=payload,
        )
        session.add(model)
        await session.commit()
        await session.refresh(model)
        
        event_domain = Event.model_validate(model)

        # Publish to Redis PubSub for real-time subscribers
        client = await get_redis_client()
        channel = f"aegis:events:{tenant_id}"
        await client.publish(channel, json.dumps({
            "id": str(event_domain.id),
            "event_type": event_domain.event_type.value,
            "run_id": str(run_id) if run_id else None,
            "payload": payload,
            "created_at": event_domain.created_at.isoformat(),
        }))

        return event_domain
