import random
import math

class RetryPolicy:
    def __init__(
        self,
        max_attempts: int = 5,
        base_delay_seconds: float = 1.0,
        max_delay_seconds: float = 60.0,
        jitter: bool = True,
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay_seconds
        self.max_delay = max_delay_seconds
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        if attempt <= 0:
            return 0.0
        
        # Exponential backoff: base * 2^(attempt - 1)
        exponential_delay = min(self.max_delay, self.base_delay * math.pow(2, attempt - 1))
        
        if self.jitter:
            # Full jitter formula: random between 0 and exponential_delay
            return random.uniform(0, exponential_delay)
        return exponential_delay

    def should_retry(self, attempt: int, is_transient_error: bool) -> bool:
        if not is_transient_error:
            return False
        return attempt < self.max_attempts
