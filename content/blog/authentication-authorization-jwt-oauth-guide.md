---
title: "Authentication & Authorization: Complete Guide to JWT, OAuth 2.0, and Security"
description: "Master authentication and authorization in web applications. Learn JWT tokens, OAuth 2.0 flows, session management, RBAC, and security best practices with Python and Node.js implementations."
date: "2024-12-19"
author: "Tushar Agrawal"
tags: ["Authentication", "Authorization", "JWT", "OAuth", "Security", "Backend"]
image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Authentication and authorization are the gatekeepers of every secure application. At Dr. Dangs Lab, we handle sensitive healthcare data requiring robust security. This guide covers everything from basic concepts to production-ready implementations.

## Authentication vs Authorization

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  AUTHENTICATION                      AUTHORIZATION                   │
│  "Who are you?"                      "What can you do?"             │
│                                                                      │
│  ┌─────────────┐                    ┌─────────────┐                 │
│  │   Login     │                    │   Roles     │                 │
│  │   Verify    │        ───►        │ Permissions │                 │
│  │   Identity  │                    │   Access    │                 │
│  └─────────────┘                    └─────────────┘                 │
│                                                                      │
│  Examples:                          Examples:                        │
│  - Username/Password                - Admin can delete users        │
│  - OAuth login                      - User can view own data        │
│  - Biometrics                       - Guest can only read           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## JWT (JSON Web Tokens)

### JWT Structure

```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4iLCJpYXQiOjE1MTYyMzkwMjJ9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

┌─────────────────────────────────────────────────────────────────────┐
│  HEADER (Algorithm & Type)                                          │
│  {                                                                   │
│    "alg": "HS256",                                                  │
│    "typ": "JWT"                                                     │
│  }                                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PAYLOAD (Claims)                                                    │
│  {                                                                   │
│    "sub": "1234567890",      // Subject (user ID)                   │
│    "name": "John Doe",       // Custom claim                        │
│    "iat": 1516239022,        // Issued at                           │
│    "exp": 1516242622,        // Expiration                          │
│    "role": "admin"           // Custom claim                        │
│  }                                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  SIGNATURE                                                           │
│  HMACSHA256(                                                        │
│    base64UrlEncode(header) + "." + base64UrlEncode(payload),       │
│    secret                                                           │
│  )                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### JWT Implementation (Python/FastAPI)

```python
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt

app = FastAPI()

# Configuration
SECRET_KEY = "your-secret-key-keep-it-safe"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    type: str  # "access" or "refresh"
    role: Optional[str] = None

class AuthService:
    def __init__(self, secret_key: str, algorithm: str):
        self.secret_key = secret_key
        self.algorithm = algorithm

    def create_access_token(self, user_id: str, role: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
            "role": role,
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh",
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str, token_type: str = "access") -> TokenPayload:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}"
                )

            return TokenPayload(**payload)

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

auth_service = AuthService(SECRET_KEY, ALGORITHM)

# Dependency for protected routes
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    token = credentials.credentials
    return auth_service.verify_token(token, "access")

# Login endpoint
@app.post("/auth/login")
async def login(email: str, password: str):
    # Fetch user from database
    user = await db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not auth_service.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate tokens
    access_token = auth_service.create_access_token(str(user.id), user.role)
    refresh_token = auth_service.create_refresh_token(str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Refresh token endpoint
@app.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    payload = auth_service.verify_token(refresh_token, "refresh")

    # Fetch user to get current role
    user = await db.get_user(payload.sub)

    # Generate new access token
    access_token = auth_service.create_access_token(str(user.id), user.role)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Protected route example
@app.get("/users/me")
async def get_current_user_profile(current_user: TokenPayload = Depends(get_current_user)):
    user = await db.get_user(current_user.sub)
    return user
```

## OAuth 2.0

### OAuth 2.0 Flows

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OAUTH 2.0 AUTHORIZATION CODE FLOW                 │
└─────────────────────────────────────────────────────────────────────┘

  User          Your App         Auth Server        Resource Server
   │                │                  │                   │
   │  1. Login      │                  │                   │
   │───────────────►│                  │                   │
   │                │                  │                   │
   │  2. Redirect to Auth Server       │                   │
   │◄───────────────│                  │                   │
   │                │                  │                   │
   │  3. User authenticates            │                   │
   │──────────────────────────────────►│                   │
   │                │                  │                   │
   │  4. Authorization code            │                   │
   │◄──────────────────────────────────│                   │
   │                │                  │                   │
   │  5. Send code to app              │                   │
   │───────────────►│                  │                   │
   │                │                  │                   │
   │                │  6. Exchange code for tokens         │
   │                │─────────────────►│                   │
   │                │                  │                   │
   │                │  7. Access + Refresh tokens          │
   │                │◄─────────────────│                   │
   │                │                  │                   │
   │                │  8. API request with access token    │
   │                │─────────────────────────────────────►│
   │                │                  │                   │
   │                │  9. Protected resource               │
   │                │◄─────────────────────────────────────│
   │                │                  │                   │
```

### OAuth 2.0 Implementation (Google Login)

```python
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
import os

app = FastAPI()

# OAuth configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@app.get('/auth/google')
async def google_login(request: Request):
    """Redirect to Google for authentication"""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth/google/callback')
async def google_callback(request: Request):
    """Handle callback from Google"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        # Check if user exists, if not create
        user = await db.get_user_by_email(user_info['email'])
        if not user:
            user = await db.create_user({
                'email': user_info['email'],
                'name': user_info['name'],
                'picture': user_info.get('picture'),
                'provider': 'google',
                'provider_id': user_info['sub']
            })

        # Generate our own JWT tokens
        access_token = auth_service.create_access_token(str(user.id), user.role)
        refresh_token = auth_service.create_refresh_token(str(user.id))

        # Redirect to frontend with tokens
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        )

    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/error?message={str(e)}")
```

## Role-Based Access Control (RBAC)

```python
from enum import Enum
from functools import wraps
from typing import List

class Permission(Enum):
    READ_USERS = "read:users"
    WRITE_USERS = "write:users"
    DELETE_USERS = "delete:users"
    READ_REPORTS = "read:reports"
    WRITE_REPORTS = "write:reports"
    ADMIN = "admin:all"

class Role(Enum):
    GUEST = "guest"
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"

# Role-Permission mapping
ROLE_PERMISSIONS = {
    Role.GUEST: [Permission.READ_REPORTS],
    Role.USER: [
        Permission.READ_USERS,
        Permission.READ_REPORTS,
        Permission.WRITE_REPORTS
    ],
    Role.MODERATOR: [
        Permission.READ_USERS,
        Permission.WRITE_USERS,
        Permission.READ_REPORTS,
        Permission.WRITE_REPORTS
    ],
    Role.ADMIN: [Permission.ADMIN]  # Admin has all permissions
}

class RBACService:
    def has_permission(self, user_role: str, required_permission: Permission) -> bool:
        role = Role(user_role)
        permissions = ROLE_PERMISSIONS.get(role, [])

        # Admin has all permissions
        if Permission.ADMIN in permissions:
            return True

        return required_permission in permissions

    def has_any_permission(self, user_role: str, permissions: List[Permission]) -> bool:
        return any(self.has_permission(user_role, p) for p in permissions)

    def has_all_permissions(self, user_role: str, permissions: List[Permission]) -> bool:
        return all(self.has_permission(user_role, p) for p in permissions)

rbac = RBACService()

# Permission decorator
def require_permission(permission: Permission):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: TokenPayload = Depends(get_current_user), **kwargs):
            if not rbac.has_permission(current_user.role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage
@app.delete("/users/{user_id}")
@require_permission(Permission.DELETE_USERS)
async def delete_user(user_id: str, current_user: TokenPayload = Depends(get_current_user)):
    await db.delete_user(user_id)
    return {"message": "User deleted"}

@app.get("/reports")
@require_permission(Permission.READ_REPORTS)
async def get_reports(current_user: TokenPayload = Depends(get_current_user)):
    return await db.get_reports()
```

## Security Best Practices

### 1. Secure Token Storage (Frontend)

```typescript
// NEVER store tokens in localStorage for sensitive apps
// Use httpOnly cookies instead

// Backend sets cookie
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=True,  // HTTPS only
    samesite="lax",
    max_age=1800  // 30 minutes
)

// For SPAs, use in-memory storage with refresh rotation
class TokenManager {
    private accessToken: string | null = null;

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    clearTokens() {
        this.accessToken = null;
    }
}
```

### 2. Password Security

```python
from passlib.context import CryptContext
import secrets

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4
)

class PasswordService:
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True

    def validate_password(self, password: str) -> tuple[bool, list[str]]:
        errors = []

        if len(password) < self.MIN_LENGTH:
            errors.append(f"Password must be at least {self.MIN_LENGTH} characters")

        if self.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain uppercase letter")

        if self.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain lowercase letter")

        if self.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append("Password must contain digit")

        if self.REQUIRE_SPECIAL and not any(c in "!@#$%^&*()_+-=" for c in password):
            errors.append("Password must contain special character")

        return len(errors) == 0, errors

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, password: str, hash: str) -> bool:
        return pwd_context.verify(password, hash)

    def generate_reset_token(self) -> str:
        return secrets.token_urlsafe(32)
```

### 3. Rate Limiting for Auth Endpoints

```python
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/login")
@limiter.limit("5/minute")  # 5 attempts per minute
async def login(request: Request, credentials: LoginRequest):
    # ... login logic
    pass

@app.post("/auth/forgot-password")
@limiter.limit("3/hour")  # 3 requests per hour
async def forgot_password(request: Request, email: str):
    # ... password reset logic
    pass
```

## Key Takeaways

1. **Use JWT for stateless auth** - Scalable and works with microservices
2. **Implement refresh tokens** - Short-lived access tokens + long-lived refresh tokens
3. **Hash passwords properly** - Use bcrypt or argon2
4. **Use HTTPS everywhere** - Never transmit tokens over HTTP
5. **Implement RBAC** - Fine-grained permission control
6. **Rate limit auth endpoints** - Prevent brute force attacks
7. **Secure token storage** - httpOnly cookies or in-memory for SPAs

## Conclusion

Authentication and authorization are critical for application security. Use JWT for scalable stateless authentication, implement OAuth for social logins, and always follow security best practices. The key is defense in depth—multiple layers of security working together.

---

*Building secure applications? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss authentication strategies.*

## Related Articles

- [REST API Design Best Practices](/blog/rest-api-design-best-practices) - Build secure, well-designed APIs
- [React Server Components Security Vulnerabilities](/blog/react-server-components-security-vulnerabilities) - Frontend security concerns
- [HIPAA Compliance for Healthcare SaaS](/blog/hipaa-compliance-healthcare-saas) - Healthcare security standards
- [TypeScript Best Practices](/blog/typescript-best-practices-guide) - Type-safe authentication code
