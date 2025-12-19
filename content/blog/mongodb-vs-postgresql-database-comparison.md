---
title: "MongoDB vs PostgreSQL: Complete Database Comparison Guide"
description: "Choose the right database for your project. Compare MongoDB and PostgreSQL on data modeling, performance, scalability, ACID compliance, and use cases with practical examples and benchmarks."
date: "2024-12-10"
author: "Tushar Agrawal"
tags: ["MongoDB", "PostgreSQL", "Database", "Backend", "SQL", "NoSQL"]
image: "https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?w=1200&h=630&fit=crop"
published: true
---

## Introduction

The database choice fundamentally shapes your application's architecture. At Dr. Dangs Lab, we use both PostgreSQL for transactional healthcare data and MongoDB for flexible document storage. Here's a comprehensive comparison to help you choose.

## Quick Comparison

| Feature | PostgreSQL | MongoDB |
|---------|------------|---------|
| Type | Relational (SQL) | Document (NoSQL) |
| Schema | Rigid, predefined | Flexible, dynamic |
| ACID | Full support | Multi-document since 4.0 |
| Relationships | JOINs, foreign keys | Embedding, referencing |
| Query Language | SQL | MQL (MongoDB Query Language) |
| Scaling | Vertical + Read replicas | Horizontal sharding |
| Best For | Complex queries, transactions | Flexible data, rapid dev |

## Data Modeling

### PostgreSQL: Relational Model

```sql
-- Normalized schema with relationships
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Query with JOINs
SELECT
    p.id,
    p.title,
    u.name as author,
    COUNT(c.id) as comment_count,
    ARRAY_AGG(t.name) as tags
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON c.post_id = p.id
LEFT JOIN post_tags pt ON pt.post_id = p.id
LEFT JOIN tags t ON t.id = pt.tag_id
WHERE p.status = 'published'
GROUP BY p.id, p.title, u.name
ORDER BY p.created_at DESC;
```

### MongoDB: Document Model

```javascript
// Denormalized document with embedded data
{
  "_id": ObjectId("..."),
  "email": "john@example.com",
  "name": "John Doe",
  "createdAt": ISODate("2024-01-01"),
  "posts": [
    {
      "_id": ObjectId("..."),
      "title": "My First Post",
      "content": "Hello world...",
      "status": "published",
      "tags": ["tech", "javascript"],
      "comments": [
        {
          "_id": ObjectId("..."),
          "userId": ObjectId("..."),
          "userName": "Jane",  // Denormalized for fast reads
          "content": "Great post!",
          "createdAt": ISODate("2024-01-02")
        }
      ],
      "createdAt": ISODate("2024-01-01")
    }
  ]
}

// Or with references (more like relational)
// users collection
{
  "_id": ObjectId("user1"),
  "email": "john@example.com",
  "name": "John Doe"
}

// posts collection
{
  "_id": ObjectId("post1"),
  "userId": ObjectId("user1"),  // Reference
  "title": "My First Post",
  "content": "Hello world...",
  "tags": ["tech", "javascript"],
  "commentCount": 5  // Cached count
}

// comments collection
{
  "_id": ObjectId("comment1"),
  "postId": ObjectId("post1"),
  "userId": ObjectId("user2"),
  "content": "Great post!"
}

// Query with $lookup (like JOIN)
db.posts.aggregate([
  { $match: { status: "published" } },
  { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "author"
  }},
  { $unwind: "$author" },
  { $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "postId",
      as: "comments"
  }},
  { $project: {
      title: 1,
      authorName: "$author.name",
      commentCount: { $size: "$comments" },
      tags: 1
  }}
]);
```

## Schema Flexibility

### PostgreSQL: Schema Evolution

```sql
-- Adding columns requires migration
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN social_links JSONB;  -- Flexible JSON field

-- Using JSONB for semi-structured data
UPDATE users SET social_links = '{
  "twitter": "@johndoe",
  "linkedin": "johndoe",
  "github": "johndoe"
}'::jsonb WHERE id = 1;

-- Query JSONB fields
SELECT * FROM users
WHERE social_links->>'twitter' IS NOT NULL;

-- Index JSONB
CREATE INDEX idx_users_social ON users USING GIN(social_links);
```

### MongoDB: Schema-less Flexibility

```javascript
// Add fields anytime - no migration needed
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: {
      avatarUrl: "https://...",
      bio: "Developer",
      socialLinks: {
        twitter: "@johndoe",
        linkedin: "johndoe"
      },
      // Add completely new field
      preferences: {
        theme: "dark",
        notifications: true
      }
  }}
);

// Different documents can have different fields
// Document 1
{ _id: 1, name: "John", role: "admin" }

// Document 2 (different structure)
{ _id: 2, name: "Jane", role: "user", department: "Engineering" }

// Schema validation (optional, since MongoDB 3.6)
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name"],
      properties: {
        email: { bsonType: "string", pattern: "^.+@.+$" },
        name: { bsonType: "string", minLength: 1 },
        age: { bsonType: "int", minimum: 0 }
      }
    }
  }
});
```

## ACID and Transactions

### PostgreSQL: Full ACID Compliance

```python
import psycopg2

def transfer_money(from_account: int, to_account: int, amount: float):
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Start transaction (implicit with autocommit=False)

            # Check balance
            cur.execute(
                "SELECT balance FROM accounts WHERE id = %s FOR UPDATE",
                (from_account,)
            )
            balance = cur.fetchone()[0]

            if balance < amount:
                raise ValueError("Insufficient funds")

            # Debit source account
            cur.execute(
                "UPDATE accounts SET balance = balance - %s WHERE id = %s",
                (amount, from_account)
            )

            # Credit destination account
            cur.execute(
                "UPDATE accounts SET balance = balance + %s WHERE id = %s",
                (amount, to_account)
            )

            # Record transaction
            cur.execute(
                """INSERT INTO transactions (from_account, to_account, amount)
                   VALUES (%s, %s, %s)""",
                (from_account, to_account, amount)
            )

            # Commit transaction
            conn.commit()

    except Exception as e:
        conn.rollback()  # Rollback on any error
        raise e
    finally:
        conn.close()
```

### MongoDB: Multi-Document Transactions (4.0+)

```python
from pymongo import MongoClient

def transfer_money(from_account: str, to_account: str, amount: float):
    client = MongoClient(MONGODB_URI)
    db = client.banking

    # Start session for transaction
    with client.start_session() as session:
        with session.start_transaction():
            try:
                # Check balance
                source = db.accounts.find_one(
                    {"_id": from_account},
                    session=session
                )

                if source["balance"] < amount:
                    raise ValueError("Insufficient funds")

                # Debit source
                db.accounts.update_one(
                    {"_id": from_account},
                    {"$inc": {"balance": -amount}},
                    session=session
                )

                # Credit destination
                db.accounts.update_one(
                    {"_id": to_account},
                    {"$inc": {"balance": amount}},
                    session=session
                )

                # Record transaction
                db.transactions.insert_one({
                    "from": from_account,
                    "to": to_account,
                    "amount": amount,
                    "timestamp": datetime.utcnow()
                }, session=session)

                # Transaction auto-commits on context exit

            except Exception as e:
                # Transaction auto-aborts on exception
                raise e

# Note: Transactions in MongoDB add overhead
# Design documents to avoid transactions when possible
```

## Performance Comparison

### Query Performance

```
Simple Key Lookup:
┌─────────────────────────────────────────┐
│ PostgreSQL: SELECT * WHERE id = 123     │ ~0.1ms
│ MongoDB: db.collection.findOne({_id})   │ ~0.1ms
└─────────────────────────────────────────┘
Both excellent for primary key lookups

Complex JOINs:
┌─────────────────────────────────────────┐
│ PostgreSQL: 4-table JOIN with indexes   │ ~5ms
│ MongoDB: $lookup pipeline               │ ~15ms
└─────────────────────────────────────────┘
PostgreSQL optimized for relational queries

Document Retrieval (nested data):
┌─────────────────────────────────────────┐
│ PostgreSQL: Multiple JOINs              │ ~10ms
│ MongoDB: Single document with embedded  │ ~1ms
└─────────────────────────────────────────┘
MongoDB excels with pre-joined data

Write Performance:
┌─────────────────────────────────────────┐
│ PostgreSQL: INSERT with constraints     │ ~2ms
│ MongoDB: insertOne (no schema check)    │ ~1ms
└─────────────────────────────────────────┘
MongoDB slightly faster without constraints
```

### Indexing

```sql
-- PostgreSQL Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_content_search ON posts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_users_json ON users USING GIN(metadata jsonb_path_ops);

-- Partial index
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Expression index
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
```

```javascript
// MongoDB Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.posts.createIndex({ userId: 1, createdAt: -1 });
db.posts.createIndex({ content: "text" });  // Text search
db.users.createIndex({ "metadata.country": 1 });  // Nested field

// Partial index
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
);

// TTL index (auto-delete old documents)
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
);
```

## Scaling Strategies

### PostgreSQL Scaling

```
                    ┌──────────────────┐
                    │   Application    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Connection Pool │
                    │    (PgBouncer)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
       │   Primary   │ │  Replica 1 │ │  Replica 2 │
       │   (Write)   │ │   (Read)   │ │   (Read)   │
       └─────────────┘ └────────────┘ └────────────┘

Scaling Options:
1. Vertical scaling (bigger machine)
2. Read replicas (streaming replication)
3. Connection pooling (PgBouncer)
4. Partitioning (range/hash/list)
5. Citus extension (distributed PostgreSQL)
```

### MongoDB Scaling

```
                    ┌──────────────────┐
                    │   Application    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │     mongos       │
                    │  (Query Router)  │
                    └────────┬─────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────▼────┐            ┌─────▼────┐            ┌─────▼────┐
│ Shard 1 │            │ Shard 2  │            │ Shard 3  │
│(A-H)    │            │ (I-P)    │            │ (Q-Z)    │
├─────────┤            ├──────────┤            ├──────────┤
│Primary  │            │Primary   │            │Primary   │
│Secondary│            │Secondary │            │Secondary │
│Secondary│            │Secondary │            │Secondary │
└─────────┘            └──────────┘            └──────────┘

Native horizontal scaling:
1. Automatic sharding
2. Each shard is a replica set
3. mongos routes queries
4. Config servers store metadata
```

## Use Case Recommendations

### Choose PostgreSQL For:

```
1. Financial/Banking Applications
   - ACID transactions critical
   - Complex queries on relationships
   - Regulatory compliance

2. E-commerce Platforms
   - Order integrity
   - Inventory management
   - Complex reporting

3. Healthcare Systems
   - Patient record relationships
   - Audit trails
   - Data integrity critical

4. Analytics/Reporting
   - Complex aggregations
   - Window functions
   - CTEs for readable queries

Example: Healthcare Records
┌─────────────────────────────────────────┐
│ Patients ←→ Appointments ←→ Doctors    │
│     ↓              ↓           ↓        │
│ Lab Results   Prescriptions  Schedules │
│     ↓              ↓                    │
│ Diagnoses     Medications              │
└─────────────────────────────────────────┘
Complex relationships = PostgreSQL
```

### Choose MongoDB For:

```
1. Content Management Systems
   - Varied content types
   - Nested structures
   - Rapid schema evolution

2. Real-time Analytics
   - High write throughput
   - Time-series data
   - Aggregation pipeline

3. IoT Applications
   - Sensor data (varied formats)
   - High volume writes
   - Flexible schema

4. Catalog/Product Data
   - Different product attributes
   - Embedded reviews
   - Category hierarchies

Example: Product Catalog
{
  "type": "laptop",
  "specs": {
    "cpu": "M2 Pro",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
{
  "type": "shirt",
  "specs": {
    "size": "L",
    "color": "blue",
    "material": "cotton"
  }
}
Different products, different attributes = MongoDB
```

## Python ORM Comparison

### SQLAlchemy (PostgreSQL)

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, Session

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True)

    posts = relationship("Post", back_populates="author")

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True)
    title = Column(String(255))
    user_id = Column(Integer, ForeignKey('users.id'))

    author = relationship("User", back_populates="posts")

# Usage
engine = create_engine(DATABASE_URL)
with Session(engine) as session:
    user = User(name="John", email="john@example.com")
    post = Post(title="Hello", author=user)
    session.add(user)
    session.commit()

    # Query with eager loading
    users = session.query(User).options(
        joinedload(User.posts)
    ).all()
```

### Motor/ODMantic (MongoDB)

```python
from odmantic import Model, Field, Reference
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

class User(Model):
    name: str
    email: str = Field(unique=True)

class Post(Model):
    title: str
    author: User = Reference()

# Usage
client = AsyncIOMotorClient(MONGODB_URI)
engine = AIOEngine(client=client, database="mydb")

async def create_user_and_post():
    user = User(name="John", email="john@example.com")
    await engine.save(user)

    post = Post(title="Hello", author=user)
    await engine.save(post)

    # Query with reference resolution
    posts = await engine.find(Post)
    for post in posts:
        print(post.author.name)  # Auto-resolved
```

## Key Takeaways

| Scenario | Recommendation |
|----------|---------------|
| Strong consistency needed | PostgreSQL |
| Complex relationships | PostgreSQL |
| Flexible/evolving schema | MongoDB |
| High write throughput | MongoDB |
| Complex analytics | PostgreSQL |
| Horizontal scaling priority | MongoDB |
| ACID transactions critical | PostgreSQL |
| Rapid prototyping | MongoDB |

## Conclusion

There's no universal "better" database—both PostgreSQL and MongoDB are excellent choices depending on your requirements. PostgreSQL shines for complex relationships, transactions, and analytics. MongoDB excels with flexible schemas, horizontal scaling, and document-centric data. Consider your data model, query patterns, scaling needs, and team expertise when choosing.

---

*Need help choosing a database? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss your architecture.*
