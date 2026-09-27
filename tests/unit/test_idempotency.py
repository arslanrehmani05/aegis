from uuid import uuid4
from packages.orchestration.idempotency_manager import IdempotencyManager

def test_idempotency_key_generation_deterministic():
    run_id = uuid4()
    step_id = "step_1"
    payload = {"sku": "SKU-4812", "amount": 100}

    key1 = IdempotencyManager.generate_key(run_id, step_id, payload)
    key2 = IdempotencyManager.generate_key(run_id, step_id, payload)

    assert key1 == key2
    assert len(key1) == 64  # SHA256 hex string length

def test_idempotency_key_uniqueness():
    run_id = uuid4()
    key1 = IdempotencyManager.generate_key(run_id, "step_1", {"sku": "A"})
    key2 = IdempotencyManager.generate_key(run_id, "step_1", {"sku": "B"})

    assert key1 != key2
