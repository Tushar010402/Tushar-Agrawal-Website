from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# Blog Schemas
class BlogBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    tags: str = Field(default="")
    image_url: Optional[str] = None
    published: bool = True

class BlogCreate(BlogBase):
    pass

class BlogUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    tags: Optional[str] = None
    image_url: Optional[str] = None
    published: Optional[bool] = None

class BlogResponse(BlogBase):
    id: int
    slug: str
    author: str
    views: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Comment Schemas
class CommentBase(BaseModel):
    author_name: str = Field(..., min_length=1, max_length=100)
    author_email: Optional[str] = Field(None, max_length=255)
    content: str = Field(..., min_length=1)

class CommentCreate(CommentBase):
    blog_id: int

class CommentResponse(CommentBase):
    id: int
    blog_id: int
    approved: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Auth Schemas
class LoginRequest(BaseModel):
    phone: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminInfo(BaseModel):
    phone: str
    is_admin: bool = True
