# QAuth Integration Guide

This guide shows how to integrate QAuth into your application for authentication and authorization.

## Installation

### Current (Development)

Until packages are published, install from source:

```bash
# Rust - add to Cargo.toml
[dependencies]
qauth = { git = "https://github.com/Tushar010402/quantum-shield", branch = "master" }

# Python
pip install git+https://github.com/Tushar010402/quantum-shield.git#subdirectory=qauth/sdks/python

# Go
go get github.com/Tushar010402/quantum-shield/qauth/sdks/go/qauth

# TypeScript (when WASM is ready)
npm install @quantumshield/qauth
```

### Future (Package Managers)

```bash
# Rust
cargo add qauth

# Python
pip install qauth

# Go
go get github.com/quantumshield/qauth-go

# TypeScript
npm install @quantumshield/qauth
```

---

## Server-Side Integration

### 1. Express.js (Node.js)

```typescript
import express from 'express';
import { QAuthServer, QAuthValidator, PolicyEngine } from '@quantumshield/qauth';

const app = express();

// Initialize QAuth server
const qauth = new QAuthServer({
  issuer: 'https://auth.yourapp.com',
  audience: 'https://api.yourapp.com',
});

// Initialize policy engine
const policies = new PolicyEngine();
await policies.loadPolicy({
  id: 'urn:qauth:policy:api-user',
  rules: [
    {
      effect: 'allow',
      resources: ['users/*'],
      actions: ['read'],
    },
    {
      effect: 'allow',
      resources: ['users/${subject}', 'users/${subject}/**'],
      actions: ['read', 'write', 'delete'],
    },
  ],
});

// QAuth middleware
function qAuthMiddleware(requiredAction: string) {
  return async (req, res, next) => {
    // Extract token and proof
    const authHeader = req.headers.authorization;
    const proofHeader = req.headers['x-qauth-proof'];

    if (!authHeader?.startsWith('QAuth ')) {
      return res.status(401).json({ error: 'Missing QAuth token' });
    }

    if (!proofHeader) {
      return res.status(401).json({ error: 'Missing proof of possession' });
    }

    const token = authHeader.slice(6);

    try {
      // Validate token (dual signatures + expiry + revocation)
      const claims = await qauth.validateToken(token);

      // Verify proof of possession
      const proofValid = await qauth.verifyProof(proofHeader, {
        method: req.method,
        uri: req.path,
        body: req.body ? JSON.stringify(req.body) : undefined,
        token: token,
      });

      if (!proofValid) {
        return res.status(401).json({ error: 'Invalid proof of possession' });
      }

      // Evaluate policy
      const resource = req.path.replace('/api/', '');
      const allowed = await policies.evaluate({
        subject: claims.subject,
        resource: resource,
        action: requiredAction,
        context: {
          ip: req.ip,
          timestamp: Date.now(),
        },
      });

      if (!allowed) {
        return res.status(403).json({ error: 'Access denied by policy' });
      }

      // Attach claims to request
      req.qauth = claims;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}

// Protected routes
app.get('/api/users/:id', qAuthMiddleware('read'), (req, res) => {
  res.json({ user: { id: req.params.id, ...getUserData(req.params.id) } });
});

app.put('/api/users/:id', qAuthMiddleware('write'), (req, res) => {
  // Only allowed if user is accessing their own data (policy check)
  updateUser(req.params.id, req.body);
  res.json({ success: true });
});

// Token issuance endpoint (after user authentication)
app.post('/auth/token', async (req, res) => {
  const { username, password } = req.body;

  // Verify credentials (your auth logic)
  const user = await authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create QAuth token
  const token = await qauth.createToken({
    subject: user.id,
    policyRef: `urn:qauth:policy:${user.role}`,
    validitySeconds: 3600,
    claims: {
      email: user.email,
      roles: user.roles,
    },
  });

  res.json({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expires_in: 3600,
    token_type: 'QAuth',
  });
});

app.listen(3000);
```

### 2. FastAPI (Python)

```python
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from qauth import QAuthServer, QAuthValidator, PolicyEngine

app = FastAPI()

# Initialize QAuth
qauth_server = QAuthServer(
    issuer="https://auth.yourapp.com",
    audience="https://api.yourapp.com"
)

policy_engine = PolicyEngine()
policy_engine.load_policy({
    "id": "urn:qauth:policy:api-user",
    "rules": [
        {"effect": "allow", "resources": ["users/*"], "actions": ["read"]},
        {"effect": "allow", "resources": ["users/${subject}/**"], "actions": ["read", "write"]},
    ]
})


async def qauth_dependency(
    request: Request,
    authorization: str = Header(...),
    x_qauth_proof: str = Header(...)
):
    """QAuth authentication dependency"""
    if not authorization.startswith("QAuth "):
        raise HTTPException(401, "Invalid authorization header")

    token = authorization[6:]

    try:
        # Validate token
        claims = qauth_server.validate_token(token)

        # Verify proof of possession
        body = await request.body()
        proof_valid = qauth_server.verify_proof(
            x_qauth_proof,
            method=request.method,
            uri=str(request.url.path),
            body=body.decode() if body else None,
            token=token
        )

        if not proof_valid:
            raise HTTPException(401, "Invalid proof of possession")

        return claims

    except Exception as e:
        raise HTTPException(401, str(e))


def require_permission(resource: str, action: str):
    """Policy check dependency factory"""
    async def check_permission(
        request: Request,
        claims = Depends(qauth_dependency)
    ):
        # Substitute subject in resource pattern
        resolved_resource = resource.replace("${subject}", claims["subject"])

        allowed = policy_engine.evaluate(
            subject=claims["subject"],
            resource=resolved_resource,
            action=action
        )

        if not allowed:
            raise HTTPException(403, "Access denied")

        return claims

    return check_permission


# Protected endpoints
@app.get("/api/users/{user_id}")
async def get_user(
    user_id: str,
    claims = Depends(require_permission("users/{user_id}", "read"))
):
    return {"user_id": user_id, "subject": claims["subject"]}


@app.put("/api/users/{user_id}")
async def update_user(
    user_id: str,
    data: dict,
    claims = Depends(require_permission("users/${subject}", "write"))
):
    # Policy ensures users can only update their own data
    return {"updated": True}


# Token issuance
@app.post("/auth/token")
async def create_token(username: str, password: str):
    # Authenticate user
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(401, "Invalid credentials")

    token = qauth_server.create_token(
        subject=user["id"],
        policy_ref=f"urn:qauth:policy:{user['role']}",
        validity_seconds=3600,
        claims={"email": user["email"]}
    )

    return {
        "access_token": token.access_token,
        "refresh_token": token.refresh_token,
        "expires_in": 3600,
        "token_type": "QAuth"
    }
```

### 3. Axum (Rust)

```rust
use axum::{
    extract::{Path, State},
    http::{header, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use qauth::{
    IssuerSigningKeys, EncryptionKey, QTokenBuilder, QTokenValidator,
    ProofValidator, PolicyEngine, PolicyEvaluator,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// Application state
struct AppState {
    signing_keys: IssuerSigningKeys,
    encryption_key: EncryptionKey,
    validator: QTokenValidator,
    policy_engine: PolicyEngine,
}

// Claims attached to request
#[derive(Clone)]
struct QAuthClaims {
    subject: String,
    policy_ref: String,
}

// QAuth middleware
async fn qauth_middleware<B>(
    State(state): State<Arc<AppState>>,
    mut request: Request<B>,
    next: Next<B>,
) -> Result<impl IntoResponse, StatusCode> {
    // Extract headers
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let proof_header = request
        .headers()
        .get("x-qauth-proof")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("QAuth ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[6..];

    // Validate token
    let claims = state
        .validator
        .validate(token.as_bytes())
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Verify proof of possession
    let method = request.method().as_str();
    let uri = request.uri().path();

    let proof_valid = ProofValidator::verify(
        proof_header.as_bytes(),
        method,
        uri,
        None, // body hash
        token.as_bytes(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if !proof_valid {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Attach claims to request extensions
    request.extensions_mut().insert(QAuthClaims {
        subject: String::from_utf8_lossy(&claims.subject).to_string(),
        policy_ref: claims.policy_ref.clone(),
    });

    Ok(next.run(request).await)
}

// Protected route handlers
async fn get_user(
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
    claims: axum::Extension<QAuthClaims>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Check policy
    let allowed = state.policy_engine.evaluate(
        &claims.subject,
        &format!("users/{}", user_id),
        "read",
    );

    if !allowed {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(Json(serde_json::json!({
        "user_id": user_id,
        "requested_by": claims.subject
    })))
}

// Token issuance
#[derive(Deserialize)]
struct TokenRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
}

async fn create_token(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TokenRequest>,
) -> Result<Json<TokenResponse>, StatusCode> {
    // Authenticate (your logic)
    let user = authenticate_user(&req.username, &req.password)
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = QTokenBuilder::access_token()
        .subject(user.id.as_bytes().to_vec())
        .issuer("https://auth.yourapp.com")
        .audience("https://api.yourapp.com")
        .policy_ref(&format!("urn:qauth:policy:{}", user.role))
        .validity_seconds(3600)
        .build(&state.signing_keys, &state.encryption_key)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(TokenResponse {
        access_token: base64::encode(&token),
        token_type: "QAuth".to_string(),
        expires_in: 3600,
    }))
}

#[tokio::main]
async fn main() {
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let validator = QTokenValidator::new(
        signing_keys.verifying_keys(),
        encryption_key.to_bytes(),
    );

    let mut policy_engine = PolicyEngine::new();
    policy_engine.load_policy(/* ... */);

    let state = Arc::new(AppState {
        signing_keys,
        encryption_key,
        validator,
        policy_engine,
    });

    let app = Router::new()
        .route("/api/users/:id", get(get_user))
        .layer(middleware::from_fn_with_state(state.clone(), qauth_middleware))
        .route("/auth/token", post(create_token))
        .with_state(state);

    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

---

## Client-Side Integration

### JavaScript/TypeScript Client

```typescript
import { QAuthClient } from '@quantumshield/qauth';

class ApiClient {
  private client: QAuthClient;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = new QAuthClient();
  }

  async login(username: string, password: string): Promise<void> {
    const response = await fetch('https://auth.yourapp.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
  }

  async request(method: string, path: string, body?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // Create proof of possession for this specific request
    const proof = this.client.createProof(
      method,
      path,
      body ? JSON.stringify(body) : undefined,
      this.accessToken
    );

    const response = await fetch(`https://api.yourapp.com${path}`, {
      method,
      headers: {
        'Authorization': `QAuth ${this.accessToken}`,
        'X-QAuth-Proof': proof,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshAccessToken();
      return this.request(method, path, body);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<void> {
    // Similar to login but with refresh token
    // Implementation depends on your refresh flow
  }
}

// Usage
const api = new ApiClient();
await api.login('user@example.com', 'password');

// Every request automatically includes proof of possession
const user = await api.request('GET', '/api/users/me');
await api.request('PUT', '/api/users/me', { name: 'New Name' });
```

### Python Client

```python
import requests
from qauth import QAuthClient


class ApiClient:
    def __init__(self, auth_url: str, api_url: str):
        self.auth_url = auth_url
        self.api_url = api_url
        self.client = QAuthClient()
        self.access_token = None
        self.refresh_token = None

    def login(self, username: str, password: str):
        response = requests.post(
            f"{self.auth_url}/auth/token",
            json={"username": username, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]

    def request(self, method: str, path: str, body: dict = None):
        if not self.access_token:
            raise Exception("Not authenticated")

        # Create proof of possession
        proof = self.client.create_proof(
            method=method,
            uri=path,
            body=body,
            token=self.access_token
        )

        response = requests.request(
            method,
            f"{self.api_url}{path}",
            headers={
                "Authorization": f"QAuth {self.access_token}",
                "X-QAuth-Proof": proof,
            },
            json=body
        )

        if response.status_code == 401:
            self.refresh_access_token()
            return self.request(method, path, body)

        response.raise_for_status()
        return response.json()


# Usage
api = ApiClient("https://auth.yourapp.com", "https://api.yourapp.com")
api.login("user@example.com", "password")

user = api.request("GET", "/api/users/me")
api.request("PUT", "/api/users/me", {"name": "New Name"})
```

---

## Migration from OAuth 2.0 / JWT

### Step 1: Dual Token Support

Support both JWT and QAuth during migration:

```typescript
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;

  if (auth?.startsWith('Bearer ')) {
    // Legacy JWT validation
    const token = auth.slice(7);
    req.user = validateJWT(token);
  } else if (auth?.startsWith('QAuth ')) {
    // New QAuth validation
    const token = auth.slice(6);
    const proof = req.headers['x-qauth-proof'];
    req.user = validateQAuth(token, proof, req);
  } else {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  next();
}
```

### Step 2: Issue QAuth Tokens for New Sessions

```typescript
app.post('/auth/token', async (req, res) => {
  const user = await authenticateUser(req.body);

  // Check if client supports QAuth
  const clientSupportsQAuth = req.headers['x-qauth-client-key'];

  if (clientSupportsQAuth) {
    // Issue QAuth token
    const qtoken = await qauth.createToken({ ... });
    return res.json({
      access_token: qtoken,
      token_type: 'QAuth',
    });
  } else {
    // Issue legacy JWT
    const jwt = createJWT({ ... });
    return res.json({
      access_token: jwt,
      token_type: 'Bearer',
    });
  }
});
```

### Step 3: Full Migration

After all clients support QAuth, remove JWT support.

---

## Security Best Practices

### 1. Always Verify Proof of Possession

```typescript
// WRONG - token only
const claims = validateToken(token); // Stolen token works!

// CORRECT - token + proof
const claims = validateToken(token);
const proofValid = verifyProof(proof, req, token);
if (!proofValid) throw new Error('Invalid proof');
```

### 2. Use Policy-Based Authorization

```typescript
// WRONG - hardcoded checks
if (user.role === 'admin' || user.id === resourceOwnerId) {
  // allow
}

// CORRECT - policy evaluation
const allowed = policyEngine.evaluate({
  subject: user.id,
  resource: `projects/${projectId}`,
  action: 'write',
});
```

### 3. Implement Revocation Checking

```typescript
// Token validation should check revocation
const claims = await validateToken(token);

// Check if token is revoked (automatic with 5-min cache)
const isRevoked = await checkRevocation(claims.revocationId);
if (isRevoked) {
  throw new Error('Token has been revoked');
}
```

### 4. Rotate Keys Periodically

```typescript
// Generate new keys
const newKeys = IssuerSigningKeys.generate();

// Publish new public keys (keep old ones for validation)
await publishPublicKeys([newKeys.publicKeys, ...oldPublicKeys]);

// Start issuing tokens with new keys
// Old tokens remain valid until expiry
```

---

## Troubleshooting

### "Invalid signature" Error

1. Ensure both Ed25519 AND ML-DSA-65 signatures are present
2. Check that the message being signed matches exactly
3. Verify key IDs match between token and validator

### "Proof of possession failed" Error

1. Check timestamp is within 60 seconds
2. Ensure method/URI/body hash match the actual request
3. Verify client key matches the one bound in token

### "Policy evaluation denied" Error

1. Check that policy is loaded correctly
2. Verify resource pattern matches the request path
3. Check conditions (time, IP, MFA status)

---

## Support

- Documentation: https://tusharagrawal.in/qauth
- GitHub Issues: https://github.com/Tushar010402/quantum-shield/issues
- Blog: https://tusharagrawal.in/blog/qauth-post-quantum-authentication-protocol
