---
title: "REST API Design Best Practices: Building APIs That Developers Love"
description: "Learn how to design clean, scalable, and developer-friendly REST APIs. Covers URL structure, HTTP methods, status codes, pagination, versioning, error handling, and security best practices."
date: "2024-12-12"
author: "Tushar Agrawal"
tags: ["REST API", "API Design", "Backend", "Web Development", "Best Practices"]
image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&h=630&fit=crop"
published: true
---

## Introduction

A well-designed API is a joy to work with. A poorly designed one causes frustration, bugs, and wasted developer hours. Having built APIs consumed by mobile apps, third-party integrations, and internal services at Dr. Dangs Lab, I've learned what separates great APIs from mediocre ones.

## RESTful URL Design

### Resource Naming Conventions

```
# Good: Nouns, plural, lowercase, hyphens for multi-word
GET    /users
GET    /users/123
GET    /users/123/orders
GET    /lab-results
GET    /medical-records

# Bad: Verbs, singular, camelCase, underscores
GET    /getUsers
GET    /user/123
GET    /get_lab_results
POST   /createOrder
```

### URL Structure Patterns

```
# Collection
GET    /users                    # List all users
POST   /users                    # Create a user

# Single resource
GET    /users/123               # Get user 123
PUT    /users/123               # Replace user 123
PATCH  /users/123               # Partial update user 123
DELETE /users/123               # Delete user 123

# Nested resources (parent-child relationship)
GET    /users/123/orders        # User's orders
POST   /users/123/orders        # Create order for user
GET    /users/123/orders/456    # Specific order

# Related resources (use query params for filtering)
GET    /orders?user_id=123      # Orders filtered by user

# Actions (when CRUD doesn't fit)
POST   /orders/123/cancel       # Cancel an order
POST   /users/123/verify-email  # Trigger email verification
```

## HTTP Methods and Status Codes

### HTTP Methods

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    email: str
    name: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None

# GET - Retrieve resource (idempotent, safe)
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# POST - Create resource (not idempotent)
@app.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    new_user = await db.create_user(user)
    return new_user

# PUT - Replace entire resource (idempotent)
@app.put("/users/{user_id}")
async def replace_user(user_id: int, user: UserCreate):
    updated = await db.replace_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

# PATCH - Partial update (idempotent)
@app.patch("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    # Only update provided fields
    update_data = user.model_dump(exclude_unset=True)
    updated = await db.update_user(user_id, update_data)
    return updated

# DELETE - Remove resource (idempotent)
@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    deleted = await db.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
```

### Status Codes Cheat Sheet

```python
# 2xx Success
200 OK              # GET, PUT, PATCH successful
201 Created         # POST successful, resource created
204 No Content      # DELETE successful, no body returned

# 3xx Redirection
301 Moved Permanently  # Resource URL changed permanently
304 Not Modified       # Cached response still valid

# 4xx Client Errors
400 Bad Request     # Invalid request syntax/data
401 Unauthorized    # Authentication required
403 Forbidden       # Authenticated but not authorized
404 Not Found       # Resource doesn't exist
405 Method Not Allowed  # HTTP method not supported
409 Conflict        # Resource state conflict (e.g., duplicate)
422 Unprocessable Entity  # Validation failed
429 Too Many Requests    # Rate limit exceeded

# 5xx Server Errors
500 Internal Server Error  # Unexpected server error
502 Bad Gateway           # Upstream service error
503 Service Unavailable   # Server temporarily unavailable
504 Gateway Timeout       # Upstream service timeout
```

## Request and Response Design

### Consistent Response Format

```python
from pydantic import BaseModel
from typing import Generic, TypeVar, List, Optional
from datetime import datetime

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: T
    message: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    pagination: dict
    timestamp: datetime = datetime.utcnow()

# Usage
@app.get("/users/{user_id}", response_model=APIResponse[User])
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    return APIResponse(success=True, data=user)

# Response
{
    "success": true,
    "data": {
        "id": 123,
        "email": "john@example.com",
        "name": "John Doe"
    },
    "message": null,
    "timestamp": "2024-12-12T10:30:00Z"
}
```

### Error Response Format

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[List[ErrorDetail]] = None
    request_id: str
    timestamp: datetime

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "request_id": request.state.request_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Validation error response
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "field": "email",
            "message": "Invalid email format",
            "code": "INVALID_EMAIL"
        },
        {
            "field": "age",
            "message": "Must be at least 18",
            "code": "MIN_VALUE"
        }
    ],
    "request_id": "req_abc123",
    "timestamp": "2024-12-12T10:30:00Z"
}
```

## Pagination

### Cursor-Based Pagination (Recommended)

```python
from fastapi import Query
from typing import Optional
import base64
import json

@app.get("/users")
async def list_users(
    limit: int = Query(default=20, le=100),
    cursor: Optional[str] = None
):
    # Decode cursor
    if cursor:
        cursor_data = json.loads(base64.b64decode(cursor))
        after_id = cursor_data["id"]
        after_date = cursor_data["created_at"]
    else:
        after_id = 0
        after_date = None

    # Fetch data
    users = await db.get_users(
        limit=limit + 1,  # Fetch one extra to check if more exist
        after_id=after_id
    )

    has_more = len(users) > limit
    if has_more:
        users = users[:limit]

    # Create next cursor
    next_cursor = None
    if has_more and users:
        last_user = users[-1]
        cursor_data = {"id": last_user.id, "created_at": last_user.created_at.isoformat()}
        next_cursor = base64.b64encode(json.dumps(cursor_data).encode()).decode()

    return {
        "success": True,
        "data": users,
        "pagination": {
            "limit": limit,
            "has_more": has_more,
            "next_cursor": next_cursor
        }
    }
```

### Offset-Based Pagination (Simple)

```python
@app.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, le=100)
):
    offset = (page - 1) * per_page
    users = await db.get_users(limit=per_page, offset=offset)
    total = await db.count_users()

    return {
        "success": True,
        "data": users,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
            "has_next": page * per_page < total,
            "has_prev": page > 1
        }
    }
```

## Filtering, Sorting, and Field Selection

```python
@app.get("/orders")
async def list_orders(
    # Filtering
    status: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    min_amount: Optional[float] = Query(None, description="Minimum order amount"),
    max_amount: Optional[float] = Query(None, description="Maximum order amount"),
    created_after: Optional[datetime] = Query(None, description="Created after date"),

    # Sorting
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),

    # Field selection
    fields: Optional[str] = Query(None, description="Comma-separated fields to return"),

    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100)
):
    # Build query with filters
    filters = {}
    if status:
        filters["status"] = status
    if user_id:
        filters["user_id"] = user_id
    if min_amount:
        filters["amount__gte"] = min_amount
    if max_amount:
        filters["amount__lte"] = max_amount

    # Parse fields
    selected_fields = fields.split(",") if fields else None

    orders = await db.get_orders(
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        fields=selected_fields,
        limit=per_page,
        offset=(page - 1) * per_page
    )

    return {"success": True, "data": orders}

# Usage examples:
# GET /orders?status=pending&sort_by=amount&sort_order=desc
# GET /orders?min_amount=100&max_amount=500&fields=id,status,amount
# GET /orders?created_after=2024-01-01T00:00:00Z&user_id=123
```

## API Versioning

```python
from fastapi import APIRouter

# URL versioning (most common)
v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: int):
    return {"id": user_id, "name": "John"}  # Old format

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: int):
    return {
        "data": {"id": user_id, "name": "John"},
        "meta": {"version": "2.0"}
    }  # New format with envelope

app.include_router(v1_router)
app.include_router(v2_router)

# Header versioning (alternative)
@app.get("/users/{user_id}")
async def get_user(user_id: int, api_version: str = Header(default="1.0")):
    if api_version == "2.0":
        return {"data": {...}, "meta": {...}}
    return {...}  # v1 format
```

## Authentication and Security

```python
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return await db.get_user(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Protected endpoint
@app.get("/users/me")
async def get_current_user_profile(user: User = Depends(get_current_user)):
    return user

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/resource")
@limiter.limit("100/minute")
async def rate_limited_endpoint(request: Request):
    return {"data": "This endpoint is rate limited"}
```

## Documentation with OpenAPI

```python
from fastapi import FastAPI

app = FastAPI(
    title="Healthcare API",
    description="API for managing patient data and lab results",
    version="2.0.0",
    contact={
        "name": "Tushar Agrawal",
        "email": "tusharagrawal0104@gmail.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
)

@app.get(
    "/patients/{patient_id}",
    summary="Get patient by ID",
    description="Retrieve detailed information about a specific patient",
    response_description="Patient details",
    responses={
        200: {"description": "Patient found"},
        404: {"description": "Patient not found"},
        401: {"description": "Not authenticated"}
    },
    tags=["Patients"]
)
async def get_patient(patient_id: int):
    """
    Get a patient by their ID.

    - **patient_id**: The unique identifier of the patient
    """
    pass
```

## Key Takeaways

1. **Use nouns, not verbs** in URLs - let HTTP methods convey the action
2. **Be consistent** with naming, casing, and response formats
3. **Use proper status codes** - they communicate intent clearly
4. **Implement pagination** - never return unbounded lists
5. **Version your API** - breaking changes will happen
6. **Document thoroughly** - OpenAPI/Swagger is your friend
7. **Handle errors gracefully** - descriptive errors help debugging
8. **Secure by default** - authentication, rate limiting, input validation

## Conclusion

Great API design is about empathy for the developers who will use it. Follow conventions, be consistent, document well, and handle edge cases gracefully. Your future self (and your API consumers) will thank you.

---

*Building APIs? Let's discuss best practices on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a).*

## Related Articles

- [Authentication & Authorization: JWT, OAuth 2.0 Guide](/blog/authentication-authorization-jwt-oauth-guide) - Secure your APIs with proper authentication
- [GraphQL vs REST: Which to Choose?](/blog/graphql-vs-rest-api-comparison) - Compare API paradigms
- [Testing Strategies: Unit, Integration, E2E](/blog/testing-strategies-unit-integration-e2e-guide) - Test your APIs effectively
- [TypeScript Best Practices](/blog/typescript-best-practices-guide) - Type-safe API development
