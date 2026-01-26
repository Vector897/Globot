from fastapi import Depends, HTTPException, Header
from typing import Optional
from core.security import verify_token, AuthError

async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Dependency to get the current authenticated user from the Authorization header.
    Expects format: Bearer <token>
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization Header Format")
    
    token = parts[1]
    
    try:
        payload = verify_token(token)
        return payload
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.error)
