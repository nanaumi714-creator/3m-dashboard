"""Session management utilities."""
from typing import Optional
import jwt
    from datetime import datetime, timedelta

class SessionManager:
"""Manage user sessions with token refresh."""
    
    def __init__(self, secret_key: str):
self.secret_key = secret_key
self.access_token_expiry = timedelta(hours = 1)
self.refresh_token_expiry = timedelta(days = 7)
    
    def create_tokens(self, user_id: str) -> dict:
"""Create access and refresh tokens."""
now = datetime.utcnow()

access_token = jwt.encode({
    "user_id": user_id,
    "type": "access",
    "exp": now + self.access_token_expiry,
    "iat": now
}, self.secret_key, algorithm = "HS256")

refresh_token = jwt.encode({
    "user_id": user_id,
    "type": "refresh",
    "exp": now + self.refresh_token_expiry,
    "iat": now
}, self.secret_key, algorithm = "HS256")

return {
    "access_token": access_token,
    "refresh_token": refresh_token,
    "expires_in": int(self.access_token_expiry.total_seconds())
}
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
"""Verify and decode token."""
try:
payload = jwt.decode(token, self.secret_key, algorithms = ["HS256"])

if payload.get("type") != token_type:
    return None

return payload
            
        except jwt.ExpiredSignatureError:
return None
        except jwt.InvalidTokenError:
return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[dict]:
"""Refresh access token using refresh token."""
payload = self.verify_token(refresh_token, "refresh")

if not payload:
    return None

user_id = payload.get("user_id")
if not user_id:
    return None

return self.create_tokens(user_id)
