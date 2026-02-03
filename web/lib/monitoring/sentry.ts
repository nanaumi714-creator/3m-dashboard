"""Sentry error logging integration."""
import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    from typing import Dict, Any, Optional


def init_sentry(dsn: str, environment: str = "production", traces_sample_rate: float = 0.1):
"""
    Initialize Sentry error tracking.

    Args:
dsn: Sentry Data Source Name
environment: Environment name(production, staging, development)
traces_sample_rate: Performance monitoring sample rate(0.0 to 1.0)
"""
sentry_sdk.init(
    dsn = dsn,
    environment = environment,
    traces_sample_rate = traces_sample_rate,
    profiles_sample_rate = 0.1,
)


def capture_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    user_info: Optional[Dict[str, Any]] = None
):
"""
    Capture and report an error to Sentry.

    Args:
error: The exception to report
context: Additional context data
user_info: User information(id, email, etc.)
"""
with sentry_sdk.push_scope() as scope:
if context:
    for key, value in context.items():
        scope.set_extra(key, value)

if user_info:
    scope.set_user(user_info)

sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: Optional[Dict[str, Any]] = None):
"""
    Capture a message to Sentry.

    Args:
message: The message to log
level: Log level(debug, info, warning, error, fatal)
context: Additional context data
"""
with sentry_sdk.push_scope() as scope:
if context:
    for key, value in context.items():
        scope.set_extra(key, value)

sentry_sdk.capture_message(message, level = level)
