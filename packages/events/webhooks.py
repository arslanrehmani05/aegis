import hmac
import hashlib
import json
from typing import Dict, Any
import httpx

class WebhookDispatcher:
    def __init__(self, signing_secret: str):
        self.signing_secret = signing_secret.encode("utf-8")

    def generate_signature(self, payload_bytes: bytes) -> str:
        return hmac.new(self.signing_secret, payload_bytes, hashlib.sha256).hexdigest()

    async def dispatch(self, url: str, delivery_id: str, event_data: Dict[str, Any]) -> bool:
        payload_bytes = json.dumps(event_data, sort_keys=True).encode("utf-8")
        signature = self.generate_signature(payload_bytes)

        headers = {
            "Content-Type": "application/json",
            "X-Aegis-Delivery-ID": delivery_id,
            "X-Aegis-Signature": f"sha256={signature}",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(url, content=payload_bytes, headers=headers)
                return response.is_success
            except Exception:
                return False
