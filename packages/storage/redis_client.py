from typing import Optional
import json
import redis.asyncio as redis

from packages.storage.config import settings

redis_client: Optional[redis.Redis] = None

async def get_redis_client() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client

async def enqueue_run_job(run_id: str, priority: int = 1, metadata: Optional[dict] = None) -> str:
    client = await get_redis_client()
    payload = {
        "run_id": run_id,
        "priority": priority,
        "metadata": metadata or {},
    }
    await client.rpush("aegis:run_queue", json.dumps(payload))
    return run_id

async def pop_run_job(timeout: int = 5) -> Optional[dict]:
    client = await get_redis_client()
    res = await client.blpop("aegis:run_queue", timeout=timeout)
    if res:
        _, raw_payload = res
        return json.loads(raw_payload)
    return None
