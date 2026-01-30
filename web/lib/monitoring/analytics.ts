"""Performance monitoring and analytics."""
import time
    from typing import Dict, Any, Optional
from functools import wraps


class PerformanceMonitor:
"""Monitor application performance metrics."""
    
    def __init__(self):
self.metrics: Dict[str, list] = {}
    
    def record_metric(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
"""Record a performance metric."""
if name not in self.metrics:
self.metrics[name] = []

self.metrics[name].append({
    "value": value,
    "timestamp": time.time(),
    "tags": tags or {}
        })
    
    def get_average(self, name: str, last_n: Optional[int] = None) -> Optional[float]:
"""Get average value for a metric."""
if name not in self.metrics or not self.metrics[name]:
return None

values = [m["value"] for m in self.metrics[name]]
if last_n:
    values = values[-last_n:]

return sum(values) / len(values) if values else None
    
    def get_percentile(self, name: str, percentile: int = 95) -> Optional[float]:
"""Get percentile value for a metric."""
if name not in self.metrics or not self.metrics[name]:
return None

values = sorted([m["value"] for m in self.metrics[name]])
if not values:
    return None

index = int(len(values) * (percentile / 100))
return values[min(index, len(values) - 1)]


def measure_time(metric_name: str, monitor: PerformanceMonitor):
"""Decorator to measure function execution time."""
    def decorator(func):
@wraps(func)
        def wrapper(* args, ** kwargs):
start_time = time.time()
try:
result = func(* args, ** kwargs)
return result
            finally:
duration = time.time() - start_time
monitor.record_metric(
    f"{metric_name}.duration",
    duration,
    { "function": func.__name__ }
)
return wrapper
return decorator


# Global monitor instance
performance_monitor = PerformanceMonitor()
