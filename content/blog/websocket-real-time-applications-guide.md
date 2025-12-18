---
title: "WebSocket & Real-Time Applications: Complete Implementation Guide"
description: "Build real-time applications with WebSocket. Learn Socket.IO, connection management, scaling with Redis, authentication, and patterns for chat, notifications, and live updates with Python and Node.js."
date: "2024-12-18"
author: "Tushar Agrawal"
tags: ["WebSocket", "Real-time", "Socket.IO", "Backend", "Python", "Node.js"]
image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Real-time applications have become essential for modern user experiences. From live chat to collaborative editing, real-time features engage users and provide instant feedback. At Dr. Dangs Lab, we use WebSocket for live patient status updates and notifications. This guide covers everything you need to build robust real-time applications.

## WebSocket vs HTTP

```
HTTP (Request-Response):
┌─────────┐                    ┌─────────┐
│ Client  │ ────Request────►   │ Server  │
│         │ ◄───Response────   │         │
└─────────┘                    └─────────┘
- Client initiates every request
- Server cannot push data
- New connection for each request

WebSocket (Bidirectional):
┌─────────┐                    ┌─────────┐
│ Client  │ ◄──────────────►   │ Server  │
│         │    Persistent      │         │
│         │    Connection      │         │
└─────────┘                    └─────────┘
- Single persistent connection
- Both can send data anytime
- Low latency, low overhead
```

## WebSocket Implementation

### Python with FastAPI

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

app = FastAPI()

class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        # room_id -> set of connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # user_id -> connection
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str, room_id: str = None):
        await websocket.accept()
        self.user_connections[user_id] = websocket

        if room_id:
            if room_id not in self.rooms:
                self.rooms[room_id] = set()
            self.rooms[room_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, room_id: str = None):
        self.user_connections.pop(user_id, None)

        if room_id and room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def send_personal(self, user_id: str, message: dict):
        """Send message to specific user"""
        connection = self.user_connections.get(user_id)
        if connection:
            await connection.send_json(message)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all users in a room"""
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != exclude:
                    await connection.send_json(message)

    async def broadcast_all(self, message: dict):
        """Broadcast to all connected users"""
        for connection in self.user_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            await handle_message(websocket, user_id, data)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await manager.broadcast_all({
            "type": "user_left",
            "user_id": user_id
        })

async def handle_message(websocket: WebSocket, user_id: str, data: dict):
    """Handle incoming WebSocket messages"""
    message_type = data.get("type")

    if message_type == "join_room":
        room_id = data.get("room_id")
        if room_id not in manager.rooms:
            manager.rooms[room_id] = set()
        manager.rooms[room_id].add(websocket)
        await manager.broadcast_to_room(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "room_id": room_id
        })

    elif message_type == "chat_message":
        room_id = data.get("room_id")
        await manager.broadcast_to_room(room_id, {
            "type": "chat_message",
            "user_id": user_id,
            "content": data.get("content"),
            "timestamp": datetime.utcnow().isoformat()
        })

    elif message_type == "typing":
        room_id = data.get("room_id")
        await manager.broadcast_to_room(room_id, {
            "type": "typing",
            "user_id": user_id
        }, exclude=websocket)
```

### Node.js with Socket.IO

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const user = await verifyToken(token);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);

  // Join user to their personal room
  socket.join(`user:${socket.user.id}`);

  // Join room
  socket.on('join_room', async (roomId) => {
    // Verify user can access this room
    const canJoin = await checkRoomAccess(socket.user.id, roomId);
    if (!canJoin) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    socket.join(roomId);

    // Notify room members
    socket.to(roomId).emit('user_joined', {
      userId: socket.user.id,
      username: socket.user.name
    });

    // Send room history
    const history = await getChatHistory(roomId, 50);
    socket.emit('room_history', history);
  });

  // Leave room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user_left', {
      userId: socket.user.id
    });
  });

  // Chat message
  socket.on('chat_message', async (data) => {
    const { roomId, content } = data;

    // Save message to database
    const message = await saveMessage({
      roomId,
      userId: socket.user.id,
      content,
      timestamp: new Date()
    });

    // Broadcast to room
    io.to(roomId).emit('chat_message', {
      id: message.id,
      userId: socket.user.id,
      username: socket.user.name,
      content,
      timestamp: message.timestamp
    });
  });

  // Typing indicator
  socket.on('typing_start', (roomId) => {
    socket.to(roomId).emit('user_typing', {
      userId: socket.user.id,
      username: socket.user.name
    });
  });

  socket.on('typing_stop', (roomId) => {
    socket.to(roomId).emit('user_stopped_typing', {
      userId: socket.user.id
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
    io.emit('user_offline', { userId: socket.user.id });
  });
});

httpServer.listen(3000);
```

## Scaling with Redis

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

async function setupRedisAdapter(io) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
}

// Now Socket.IO works across multiple server instances
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SCALED WEBSOCKET ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────────┘

     ┌─────────┐   ┌─────────┐   ┌─────────┐
     │ Client  │   │ Client  │   │ Client  │
     └────┬────┘   └────┬────┘   └────┬────┘
          │             │             │
          └──────────┬──┴──┬──────────┘
                     │     │
              ┌──────▼─────▼──────┐
              │   Load Balancer   │
              │  (Sticky Sessions)│
              └────────┬──────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Server 1   │ │  Server 2   │ │  Server 3   │
│  Socket.IO  │ │  Socket.IO  │ │  Socket.IO  │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
              ┌────────▼────────┐
              │  Redis Pub/Sub  │
              │   (Adapter)     │
              └─────────────────┘
```

## Real-Time Patterns

### 1. Live Notifications

```python
class NotificationService:
    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager

    async def send_notification(self, user_id: str, notification: dict):
        """Send notification to specific user"""
        # Save to database
        await db.notifications.insert_one({
            "user_id": user_id,
            "type": notification["type"],
            "title": notification["title"],
            "body": notification["body"],
            "read": False,
            "created_at": datetime.utcnow()
        })

        # Send via WebSocket if user is connected
        await self.manager.send_personal(user_id, {
            "type": "notification",
            "data": notification
        })

    async def broadcast_announcement(self, announcement: dict):
        """Broadcast to all users"""
        await self.manager.broadcast_all({
            "type": "announcement",
            "data": announcement
        })

# Usage - when something happens in your app
@app.post("/orders/{order_id}/complete")
async def complete_order(order_id: str):
    order = await db.complete_order(order_id)

    # Notify the customer
    await notification_service.send_notification(
        order.customer_id,
        {
            "type": "order_complete",
            "title": "Order Complete",
            "body": f"Your order #{order_id} is ready for pickup!"
        }
    )

    return order
```

### 2. Presence System (Online/Offline)

```python
class PresenceService:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.ONLINE_TTL = 60  # seconds

    async def set_online(self, user_id: str):
        """Mark user as online"""
        await self.redis.setex(f"presence:{user_id}", self.ONLINE_TTL, "online")
        await self.redis.sadd("online_users", user_id)

    async def set_offline(self, user_id: str):
        """Mark user as offline"""
        await self.redis.delete(f"presence:{user_id}")
        await self.redis.srem("online_users", user_id)

    async def is_online(self, user_id: str) -> bool:
        """Check if user is online"""
        return await self.redis.exists(f"presence:{user_id}")

    async def get_online_users(self) -> list:
        """Get all online users"""
        return await self.redis.smembers("online_users")

    async def heartbeat(self, user_id: str):
        """Refresh user's online status"""
        await self.redis.expire(f"presence:{user_id}", self.ONLINE_TTL)

# WebSocket handler with presence
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    await presence.set_online(user_id)

    # Broadcast user came online
    await manager.broadcast_all({
        "type": "presence",
        "user_id": user_id,
        "status": "online"
    })

    try:
        while True:
            data = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=30.0
            )
            await presence.heartbeat(user_id)
            await handle_message(websocket, user_id, data)

    except asyncio.TimeoutError:
        # Send ping to check connection
        await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await presence.set_offline(user_id)
        await manager.broadcast_all({
            "type": "presence",
            "user_id": user_id,
            "status": "offline"
        })
```

### 3. Live Collaboration

```javascript
// Real-time document editing (simplified)
io.on('connection', (socket) => {
  socket.on('join_document', async (docId) => {
    socket.join(`doc:${docId}`);

    // Send current document state
    const doc = await getDocument(docId);
    socket.emit('document_state', doc);

    // Notify others
    socket.to(`doc:${docId}`).emit('user_joined', {
      userId: socket.user.id,
      cursor: null
    });
  });

  socket.on('document_change', async (data) => {
    const { docId, operations } = data;

    // Apply operations (Operational Transform or CRDT)
    await applyOperations(docId, operations);

    // Broadcast to other editors
    socket.to(`doc:${docId}`).emit('document_change', {
      userId: socket.user.id,
      operations
    });
  });

  socket.on('cursor_move', (data) => {
    const { docId, position } = data;
    socket.to(`doc:${docId}`).emit('cursor_update', {
      userId: socket.user.id,
      position
    });
  });
});
```

## Frontend Implementation

```typescript
// React Hook for WebSocket
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  reconnect = true,
  reconnectInterval = 3000
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const ws = new WebSocket(`${url}?token=${token}`);

    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();

      if (reconnect) {
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, [url, token, onMessage, onConnect, onDisconnect, reconnect, reconnectInterval]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, send, disconnect };
}

// Usage
function ChatComponent() {
  const [messages, setMessages] = useState([]);

  const { isConnected, send } = useWebSocket({
    url: 'wss://api.example.com/ws',
    token: authToken,
    onMessage: (data) => {
      if (data.type === 'chat_message') {
        setMessages(prev => [...prev, data]);
      }
    }
  });

  const sendMessage = (content: string) => {
    send({
      type: 'chat_message',
      roomId: currentRoom,
      content
    });
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Chat UI */}
    </div>
  );
}
```

## Key Takeaways

1. **Choose the right protocol** - WebSocket for true real-time, SSE for server-to-client only
2. **Handle reconnection** - Connections drop, implement auto-reconnect
3. **Scale with Redis** - Use Redis adapter for multi-server deployments
4. **Authenticate connections** - Verify tokens on WebSocket handshake
5. **Implement heartbeats** - Detect dead connections
6. **Debounce high-frequency events** - Don't flood the network

## Conclusion

WebSocket enables powerful real-time experiences that HTTP cannot match. Whether building chat, notifications, or collaborative tools, the patterns in this guide will help you build robust, scalable real-time applications.

---

*Building real-time applications? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss WebSocket architecture.*

## Related Articles

- [Redis Caching Strategies Complete Guide](/blog/redis-caching-strategies-complete-guide) - Scale WebSocket with Redis
- [Event-Driven Architecture with Kafka](/blog/event-driven-architecture-kafka) - Event streaming patterns
- [System Design Interview Guide](/blog/system-design-interview-guide) - Design real-time systems
- [Healthcare Technology at Dr Dangs Lab](/blog/healthcare-technology-dr-dangs-lab) - Real-time patient updates
