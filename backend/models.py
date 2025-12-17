from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(100), default="Tushar Agrawal")
    tags = Column(String(255), default="")  # Comma-separated tags
    image_url = Column(String(500), nullable=True)
    published = Column(Boolean, default=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    def __repr__(self):
        return f"<Blog {self.title}>"

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    blog_id = Column(Integer, nullable=False, index=True)
    author_name = Column(String(100), nullable=False)
    author_email = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Comment by {self.author_name}>"
