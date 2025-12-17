# Tushar's Blog API - FastAPI Backend

## Overview
A modern, secure Blog Management API built with FastAPI, featuring admin authentication and public blog access.

## Features

### Admin Features
- **OTP-based Authentication**: Secure login with phone number and OTP
- **Blog Management**: Full CRUD operations for blog posts
- **Comment Moderation**: Approve or delete comments
- **Draft/Publish**: Control blog visibility

### Public Features
- **View Published Blogs**: Read-only access to published content
- **Search Blogs**: Search by title, description, or tags
- **Post Comments**: Submit comments (requires admin approval)
- **View Approved Comments**: See community engagement

## Tech Stack
- **FastAPI**: Modern, fast web framework
- **SQLAlchemy 2.0**: Async ORM with SQLite
- **Pydantic**: Data validation and settings management
- **JWT**: Secure token-based authentication
- **CORS**: Configured for Next.js frontend

## Project Structure
```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Settings and configuration
├── database.py          # Database setup and session management
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── auth.py              # Authentication logic
├── routers/
│   ├── auth_router.py   # Auth endpoints
│   └── blog_router.py   # Blog & comment endpoints
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
└── blog.db             # SQLite database (created on first run)
```

## Installation

1. **Create Virtual Environment**:
```bash
cd backend
python -m venv venv
```

2. **Activate Virtual Environment**:
```bash
# Windows
.\\venv\\Scripts\\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure Environment**:
Edit `.env` file with your settings:
```env
SECRET_KEY=your-secret-key-here
ADMIN_PHONE=8126816664
ADMIN_OTP=000000
```

5. **Run Server**:
```bash
python main.py
# or
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Authentication
- **POST** `/api/auth/login` - Admin login with phone & OTP

### Public Blog Endpoints
- **GET** `/api/blogs` - Get all published blogs
- **GET** `/api/blogs/slug/{slug}` - Get blog by slug
- **GET** `/api/blogs/search?q={query}` - Search blogs
- **GET** `/api/blogs/{blog_id}/comments` - Get approved comments
- **POST** `/api/blogs/comments` - Create comment (requires approval)

### Admin Blog Endpoints (Requires Authentication)
- **POST** `/api/blogs` - Create new blog
- **GET** `/api/blogs/{blog_id}` - Get blog by ID (includes unpublished)
- **PUT** `/api/blogs/{blog_id}` - Update blog
- **DELETE** `/api/blogs/{blog_id}` - Delete blog
- **PATCH** `/api/blogs/comments/{comment_id}/approve` - Approve comment
- **DELETE** `/api/blogs/comments/{comment_id}` - Delete comment

## Authentication

### Admin Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "phone": "8126816664",
  "otp": "000000"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Using Token
Include the token in Authorization header:
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## Database Schema

### Blog Table
- `id`: Primary key
- `title`: Blog title (max 255 chars)
- `slug`: URL-friendly slug (unique)
- `description`: Short description (max 500 chars)
- `content`: Full blog content (markdown supported)
- `author`: Author name (default: "Tushar Agrawal")
- `tags`: Comma-separated tags
- `image_url`: Featured image URL
- `published`: Boolean flag
- `views`: View count
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Comment Table
- `id`: Primary key
- `blog_id`: Foreign key to blog
- `author_name`: Commenter name
- `author_email`: Commenter email (optional)
- `content`: Comment text
- `approved`: Boolean flag (default: false)
- `created_at`: Timestamp

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **OTP Verification**: Static OTP for demo (use real OTP service in production)
3. **CORS Protection**: Only whitelisted origins allowed
4. **Input Validation**: Pydantic schemas validate all inputs
5. **SQL Injection Protection**: SQLAlchemy ORM prevents injection
6. **Admin-only Endpoints**: Protected routes require valid token

## Best Practices Implemented

1. **Async/Await**: Full async support for better performance
2. **Dependency Injection**: FastAPI's DI system for clean code
3. **Type Hints**: Complete type annotations
4. **Pydantic Models**: Strong data validation
5. **Router Pattern**: Organized endpoint structure
6. **Environment Variables**: Secure configuration management
7. **Database Migrations**: Schema versioning (future enhancement)
8. **Error Handling**: Comprehensive HTTP exceptions

## Development

### Add New Blog (via API):
```bash
curl -X POST http://localhost:8000/api/blogs \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My First Blog Post",
    "description": "A short description",
    "content": "Full blog content here...",
    "tags": "python,fastapi,tutorial",
    "published": true
  }'
```

### Get All Blogs:
```bash
curl http://localhost:8000/api/blogs
```

## Production Deployment

1. **Change SECRET_KEY**: Use a strong, random key
2. **Use PostgreSQL**: Replace SQLite with PostgreSQL
3. **Enable HTTPS**: Use reverse proxy (Nginx/Caddy)
4. **Real OTP Service**: Integrate Twilio/AWS SNS
5. **Rate Limiting**: Add request rate limiting
6. **Logging**: Configure proper logging
7. **Monitoring**: Add health checks and monitoring
8. **Backup**: Regular database backups

## Troubleshooting

**Database not created:**
- Ensure the backend directory is writable
- Check file permissions
- Run with `uvicorn main:app --reload`

**CORS errors:**
- Check CORS_ORIGINS in .env
- Ensure frontend URL is whitelisted
- Restart server after env changes

**Authentication fails:**
- Verify ADMIN_PHONE and ADMIN_OTP in .env
- Check token expiration (30 minutes default)
- Clear browser localStorage if needed

## License
MIT License - Feel free to use and modify for your projects.

## Author
Tushar Agrawal
- Email: tusharagrawal0104@gmail.com
- GitHub: https://github.com/Tushar010402
