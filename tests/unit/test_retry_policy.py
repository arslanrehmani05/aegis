from packages.policies.retry_policy import RetryPolicy

def test_retry_policy_delay_calculation():
    policy = RetryPolicy(max_attempts=3, base_delay_seconds=1.0, max_delay_seconds=10.0, jitter=False)
    
    assert policy.calculate_delay(0) == 0.0
    assert policy.calculate_delay(1) == 1.0
    assert policy.calculate_delay(2) == 2.0
    assert policy.calculate_delay(3) == 4.0

def test_should_retry_transient_error():
    policy = RetryPolicy(max_attempts=3)
    
    assert policy.should_retry(attempt=1, is_transient_error=True)
    assert policy.should_retry(attempt=2, is_transient_error=True)
    assert not policy.should_retry(attempt=3, is_transient_error=True)
    assert not policy.should_retry(attempt=1, is_transient_error=False)
