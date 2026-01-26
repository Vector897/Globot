import os
import json
import logging
import httpx
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from functools import lru_cache
from config import get_settings

logger = logging.getLogger(__name__)

# Clerk configuration is loaded via get_settings()

class User(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = "user"

class ClerkAuth:
    def __init__(self):
        self.jwks: Optional[Dict[str, Any]] = None
        self.security = HTTPBearer()

    async def get_jwks(self):
        if self.jwks:
            return self.jwks
        
        settings = get_settings()
        issuer_url = settings.clerk_issuer_url
        
        if not issuer_url:
            logger.error("CLERK_ISSUER_URL is not set.")
            raise HTTPException(status_code=500, detail="Auth configuration error")

        jwks_url = f"{issuer_url}/.well-known/jwks.json"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url)
                response.raise_for_status()
                self.jwks = response.json()
                return self.jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS from {jwks_url}: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch auth keys")

    async def verify_token(self, auth: HTTPAuthorizationCredentials = Security(HTTPBearer())) -> User:
        token = auth.credentials
        jwks = await self.get_jwks()

        try:
            # Unverified header to find the kid
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            if not kid:
                raise HTTPException(status_code=401, detail="Invalid token header")

            # Find the correct key in JWKS
            rsa_key = {}
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = {
                        "kty": key.get("kty"),
                        "kid": key.get("kid"),
                        "use": key.get("use"),
                        "n": key.get("n"),
                        "e": key.get("e")
                    }
                    break
            
            if not rsa_key:
                raise HTTPException(status_code=401, detail="Invalid key identifier")

            # Verify the token
            settings = get_settings()
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                issuer=settings.clerk_issuer_url
            )
            
            # Extract user info
            user_id = payload.get("sub")
            email = payload.get("email") # Clerk JWT should include email if configured
            if not user_id:
                raise HTTPException(status_code=401, detail="Token missing subject")
            
            # Whitelist Check for Admin Role
            settings = get_settings()
            whitelist = [e.strip().lower() for e in settings.admin_whitelist.split(",")]
            
            role = payload.get("metadata", {}).get("role", "user")
            
            # If email is in whitelist, force admin role
            if email and email.lower() in whitelist:
                role = "admin"
            
            return User(id=user_id, email=email, role=role)

        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error(f"Unexpected error during token verification: {e}")
            raise HTTPException(status_code=401, detail="Unauthorized")

# Helper dependency
clerk_auth = ClerkAuth()

async def get_current_user(user: User = Depends(clerk_auth.verify_token)) -> User:
    return user

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
