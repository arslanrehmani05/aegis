import time
from typing import Optional
from packages.storage.redis_client import get_redis_client

class LeaseManager:
    def __init__(self, worker_id: str, default_ttl_seconds: int = 30):
        self.worker_id = worker_id
        self.default_ttl = default_ttl_seconds

    def _lease_key(self, run_id: str) -> str:
        return f"aegis:lease:run:{run_id}"

    async def acquire_lease(self, run_id: str, ttl_seconds: Optional[int] = None) -> bool:
        client = await get_redis_client()
        ttl = ttl_seconds or self.default_ttl
        key = self._lease_key(run_id)
        # Set nx (if not exists) with ex (ttl seconds)
        acquired = await client.set(key, self.worker_id, ex=ttl, nx=True)
        return bool(acquired)

    async def heartbeat_lease(self, run_id: str, ttl_seconds: Optional[int] = None) -> bool:
        client = await get_redis_client()
        ttl = ttl_seconds or self.default_ttl
        key = self._lease_key(run_id)
        current_holder = await client.get(key)
        if current_holder == self.worker_id:
            await client.expire(key, ttl)
            return True
        return False

    async def release_lease(self, run_id: str) -> bool:
        client = await get_redis_client()
        key = self._lease_key(run_id)
        current_holder = await client.get(key)
        if current_holder == self.worker_id:
            await client.delete(key)
            return True
        return False

    async def is_lease_valid(self, run_id: str) -> bool:
        client = await get_redis_client()
        key = self._lease_key(run_id)
        current_holder = await client.get(key)
        return current_holder == self.worker_id
