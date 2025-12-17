# Blog Portal Setup Guide

## What Has Been Created

### 1. FastAPI Backend (Complete Blog API)
Location: `backend/`

#### Features:
- **Admin Authentication**: OTP-based login system
  - Phone: `8126816664`
  - OTP: `000000`
- **Blog Management**: Full CRUD operations
- **Comment System**: Public comments with admin moderation
- **Search & Filter**: Search blogs by title/description/tags
- **SEO-Friendly**: Auto-generated slugs from titles
- **Security**: JWT tokens, CORS protection, input validation

#### Tech Stack:
- FastAPI (modern Python web framework)
- SQLAlchemy 2.0 (async ORM)
- SQLite (database)
- Pydantic (data validation)
- JWT (authentication)

### 2. Admin Portal UI
Location: `app/admin/`

- **Login Page**: `/admin` - Secure admin authentication
- **Dashboard**: `/admin/dashboard` - Blog management interface (to be completed)

### 3. Portfolio Integration
Location: `app/blog/` (to be created)

- Public blog viewing
- Blog listing with search
- Individual blog posts
- Comment section

## Quick Start Guide

### Step 1: Start the Backend API

**Option A: Using the batch file (Windows)**
```bash
cd C:\tushar-portfolio\portfolio-website\backend
start_backend.bat
```

**Option B: Manual start**
```bash
cd C:\tushar-portfolio\portfolio-website\backend
venv\Scripts\activate
python main.py
```

The API will start on: **http://localhost:8000**

### Step 2: Verify Backend is Running

Open your browser and visit:
- http://localhost:8000 - Welcome message
- http://localhost:8000/docs - Interactive API documentation (Swagger UI)
- http://localhost:8000/health - Health check

### Step 3: Test Admin Login

#### Using the Admin UI:
1. Visit: http://localhost:3003/admin
2. Enter Phone: `8126816664`
3. Enter OTP: `000000`
4. Click Login

#### Using API directly (curl/Postman):
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "8126816664", "otp": "000000"}'
```

You'll receive a token:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Step 4: Create Your First Blog Post

#### Using Swagger UI (Easiest):
1. Go to http://localhost:8000/docs
2. Click on "POST /api/blogs"
3. Click "Try it out"
4. Click "Authorize" button (top right)
5. Enter: `Bearer YOUR_TOKEN_HERE`
6. Fill in the blog data:
```json
{
  "title": "My First Blog Post",
  "description": "This is a short description of my first blog",
  "content": "This is the full content of my blog post. You can write as much as you want here!",
  "tags": "python,fastapi,tutorial",
  "published": true
}
```
7. Click "Execute"

#### Using curl:
```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Blog",
    "description": "A short description",
    "content": "Full blog content here...",
    "tags": "python,tutorial",
    "published": true
  }'
```

### Step 5: View Your Blog (Public Access)

```bash
# Get all published blogs (no auth required)
curl http://localhost:8000/api/blogs

# Get specific blog by slug
curl http://localhost:8000/api/blogs/slug/my-first-blog
```

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blogs` | Get all published blogs |
| GET | `/api/blogs/slug/{slug}` | Get blog by slug |
| GET | `/api/blogs/search?q={query}` | Search blogs |
| POST | `/api/blogs/comments` | Create comment (needs approval) |
| GET | `/api/blogs/{id}/comments` | Get approved comments |

### Admin Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/blogs` | Create blog |
| GET | `/api/blogs/{id}` | Get blog by ID (includes unpublished) |
| PUT | `/api/blogs/{id}` | Update blog |
| DELETE | `/api/blogs/{id}` | Delete blog |
| PATCH | `/api/blogs/comments/{id}/approve` | Approve comment |
| DELETE | `/api/blogs/comments/{id}` | Delete comment |

## Database

The SQLite database (`blog.db`) will be automatically created when you first run the backend.

### Tables:
- **blogs**: Stores all blog posts
- **comments**: Stores user comments

### Viewing Database:
You can use DB Browser for SQLite or similar tools to view the database:
- Download: https://sqlitebrowser.org/

## Configuration

Edit `backend/.env` to change settings:

```env
# Security
SECRET_KEY=your-secret-key-here

# Admin Credentials
ADMIN_PHONE=8126816664
ADMIN_OTP=000000

# Database
DATABASE_URL=sqlite+aiosqlite:///./blog.db

# CORS (add your deployed URL when in production)
CORS_ORIGINS=http://localhost:3003,http://localhost:3000
```

## Next Steps (To Complete Integration)

### 1. Complete Admin Dashboard
Create `/app/admin/dashboard/page.tsx` with:
- Blog list with edit/delete buttons
- Create new blog form
- Comment moderation panel
- Rich text editor (TinyMCE, Quill, or Tiptap)

### 2. Create Public Blog Pages
Create `/app/blog/page.tsx` for:
- Blog listing page
- Search functionality
- Pagination
- Tag filtering

Create `/app/blog/[slug]/page.tsx` for:
- Individual blog post view
- Comment section
- Related posts
- Share buttons

### 3. Add Blog Link to Portfolio
Update `components/ui/navbar.tsx` to add:
```typescript
{ name: "Blog", href: "/blog" }
```

## Architecture Overview

```
portfolio-website/
├── backend/                 # FastAPI Backend
│   ├── main.py             # App entry point
│   ├── config.py           # Settings
│   ├── database.py         # DB setup
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── auth.py             # JWT authentication
│   ├── routers/
│   │   ├── auth_router.py  # Auth endpoints
│   │   └── blog_router.py  # Blog/comment endpoints
│   ├── .env                # Configuration
│   ├── requirements.txt    # Python dependencies
│   └── blog.db            # SQLite database (auto-generated)
│
└── app/                    # Next.js Frontend
    ├── admin/
    │   ├── page.tsx        # Admin login
    │   └── dashboard/      # Admin panel (to create)
    ├── blog/               # Public blog pages (to create)
    └── page.tsx            # Portfolio homepage
```

## Security Notes

### For Development:
- Static OTP (`000000`) is acceptable for testing
- SQLite database is file-based and simple

### For Production:
1. **Change SECRET_KEY**: Generate a strong random key
2. **Real OTP Service**: Integrate Twilio/AWS SNS/Firebase
3. **PostgreSQL**: Use production-grade database
4. **HTTPS**: Enable SSL/TLS
5. **Rate Limiting**: Add request throttling
6. **Environment Variables**: Never commit `.env` to git

## Troubleshooting

### Backend won't start:
```bash
# Check if port 8000 is already in use
netstat -ano | findstr :8000

# Try a different port
uvicorn main:app --port 8001
```

### CORS errors in browser:
1. Make sure backend is running
2. Check `CORS_ORIGINS` in `.env` includes your frontend URL
3. Restart backend after changing `.env`

### Database errors:
```bash
# Delete and recreate database
rm blog.db
python main.py  # Will recreate automatically
```

### Authentication fails:
1. Check that phone is exactly: `8126816664`
2. Check that OTP is exactly: `000000`
3. Check browser console for errors
4. Verify token is saved in localStorage

## Testing the Complete Flow

### 1. Admin Creates Blog:
```
Admin Login → Get Token → Create Blog → Blog saved in DB
```

### 2. Public Views Blog:
```
Open /blog → See blog list → Click blog → Read content → Post comment
```

### 3. Admin Moderates:
```
Admin Dashboard → View comments → Approve/Delete → Comment visible
```

## Technologies Used

### Backend:
- **FastAPI**: Modern async web framework
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation
- **JWT**: Secure authentication
- **SQLite**: Lightweight database

### Frontend (Next.js):
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations

## Support

For any issues or questions:
- Check the API documentation: http://localhost:8000/docs
- Review backend logs in the terminal
- Check browser console for frontend errors

## Author

Tushar Agrawal
- Email: tusharagrawal0104@gmail.com
- GitHub: https://github.com/Tushar010402
- Phone: +91-8126816664

---

**Ready to start?** Run `backend/start_backend.bat` and visit http://localhost:8000/docs to explore the API!
