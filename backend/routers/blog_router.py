from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import List
import re
from database import get_db
from models import Blog, Comment
from schemas import BlogCreate, BlogUpdate, BlogResponse, CommentCreate, CommentResponse
from auth import get_current_admin, AdminInfo

router = APIRouter(prefix="/api/blogs", tags=["Blogs"])

def create_slug(title: str) -> str:
    """Create URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

# Public endpoints
@router.get("", response_model=List[BlogResponse])
async def get_all_blogs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    published_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get all blogs (public - shows only published if not admin)"""
    query = select(Blog)
    if published_only:
        query = query.where(Blog.published == True)
    query = query.offset(skip).limit(limit).order_by(Blog.created_at.desc())

    result = await db.execute(query)
    blogs = result.scalars().all()
    return blogs

@router.get("/slug/{slug}", response_model=BlogResponse)
async def get_blog_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Get a single blog by slug (public)"""
    query = select(Blog).where(Blog.slug == slug, Blog.published == True)
    result = await db.execute(query)
    blog = result.scalar_one_or_none()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Increment views
    blog.views += 1
    await db.commit()

    return blog

@router.get("/search", response_model=List[BlogResponse])
async def search_blogs(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db)
):
    """Search blogs by title, description, or tags"""
    search_term = f"%{q}%"
    query = select(Blog).where(
        Blog.published == True,
        (Blog.title.ilike(search_term) |
         Blog.description.ilike(search_term) |
         Blog.tags.ilike(search_term))
    ).order_by(Blog.created_at.desc())

    result = await db.execute(query)
    blogs = result.scalars().all()
    return blogs

# Admin endpoints
@router.post("", response_model=BlogResponse, status_code=status.HTTP_201_CREATED)
async def create_blog(
    blog_data: BlogCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Create a new blog (admin only)"""
    # Generate slug
    base_slug = create_slug(blog_data.title)
    slug = base_slug

    # Ensure slug is unique
    counter = 1
    while True:
        query = select(Blog).where(Blog.slug == slug)
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        if not existing:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create blog
    blog = Blog(
        **blog_data.model_dump(),
        slug=slug
    )
    db.add(blog)
    await db.commit()
    await db.refresh(blog)
    return blog

@router.get("/{blog_id}", response_model=BlogResponse)
async def get_blog_by_id(
    blog_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Get a single blog by ID (admin only - can view unpublished)"""
    query = select(Blog).where(Blog.id == blog_id)
    result = await db.execute(query)
    blog = result.scalar_one_or_none()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    return blog

@router.put("/{blog_id}", response_model=BlogResponse)
async def update_blog(
    blog_id: int,
    blog_update: BlogUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Update a blog (admin only)"""
    query = select(Blog).where(Blog.id == blog_id)
    result = await db.execute(query)
    blog = result.scalar_one_or_none()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Update fields
    update_data = blog_update.model_dump(exclude_unset=True)

    # If title is updated, regenerate slug
    if "title" in update_data:
        base_slug = create_slug(update_data["title"])
        slug = base_slug
        counter = 1
        while True:
            query = select(Blog).where(Blog.slug == slug, Blog.id != blog_id)
            result = await db.execute(query)
            existing = result.scalar_one_or_none()
            if not existing:
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        update_data["slug"] = slug

    for key, value in update_data.items():
        setattr(blog, key, value)

    await db.commit()
    await db.refresh(blog)
    return blog

@router.delete("/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog(
    blog_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Delete a blog (admin only)"""
    query = select(Blog).where(Blog.id == blog_id)
    result = await db.execute(query)
    blog = result.scalar_one_or_none()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    await db.delete(blog)
    await db.commit()

# Comments
@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a comment (public - requires approval)"""
    # Check if blog exists
    query = select(Blog).where(Blog.id == comment_data.blog_id)
    result = await db.execute(query)
    blog = result.scalar_one_or_none()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    comment = Comment(**comment_data.model_dump())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment

@router.get("/{blog_id}/comments", response_model=List[CommentResponse])
async def get_blog_comments(
    blog_id: int,
    approved_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get comments for a blog"""
    query = select(Comment).where(Comment.blog_id == blog_id)
    if approved_only:
        query = query.where(Comment.approved == True)
    query = query.order_by(Comment.created_at.desc())

    result = await db.execute(query)
    comments = result.scalars().all()
    return comments

@router.patch("/comments/{comment_id}/approve", response_model=CommentResponse)
async def approve_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Approve a comment (admin only)"""
    query = select(Comment).where(Comment.id == comment_id)
    result = await db.execute(query)
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.approved = True
    await db.commit()
    await db.refresh(comment)
    return comment

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminInfo = Depends(get_current_admin)
):
    """Delete a comment (admin only)"""
    query = select(Comment).where(Comment.id == comment_id)
    result = await db.execute(query)
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.delete(comment)
    await db.commit()
