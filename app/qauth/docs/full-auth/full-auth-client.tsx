"use client";

import { CodePreview } from "@/components/quantum-shield/CodePreview";
import Link from "next/link";

const dbSchemaSQL = `-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255),
  roles TEXT[] DEFAULT '{user}',
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_jti VARCHAR(64) UNIQUE NOT NULL,
  client_public_key TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_jti ON sessions(token_jti);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);`;

const serverSetupCode = `import { QAuthServer, PolicyEngine } from '@quantumshield/qauth';

// Initialize QAuth server (do this once at startup)
const qauth = new QAuthServer({
  issuer: 'https://auth.yourapp.com',
  audience: 'https://api.yourapp.com',
});

// Share these public keys with your API servers
const publicKeys = qauth.getPublicKeys();

// Initialize policy engine
const policyEngine = new PolicyEngine();
policyEngine.loadPolicy({
  id: 'urn:qauth:policy:app',
  version: '1.0',
  issuer: 'https://auth.yourapp.com',
  rules: [
    {
      id: 'authenticated-read',
      effect: 'allow',
      resources: ['api/*'],
      actions: ['read', 'list'],
    },
    {
      id: 'own-resources',
      effect: 'allow',
      resources: ['api/users/{userId}/**'],
      actions: ['read', 'update'],
    },
    {
      id: 'admin-full',
      effect: 'allow',
      resources: ['api/**'],
      actions: ['*'],
      conditions: { custom: { role: { in: ['admin'] } } },
      priority: 10,
    },
  ],
});

export { qauth, policyEngine, publicKeys };`;

const signupCode = `import { qauth } from './server';
import bcrypt from 'bcrypt';
import { db } from './database';

export async function signup(email: string, password: string, name: string) {
  // 1. Validate input
  if (!email || !password || password.length < 8) {
    throw new Error('Invalid input');
  }

  // 2. Check if user exists
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1', [email]
  );
  if (existing.rows.length > 0) {
    throw new Error('Email already registered');
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Create user
  const result = await db.query(
    \`INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3) RETURNING id, email, roles\`,
    [email, passwordHash, name]
  );
  const user = result.rows[0];

  // 5. Create QAuth token
  const token = qauth.createToken({
    subject: user.id,
    policyRef: 'urn:qauth:policy:app',
    validitySeconds: 3600, // 1 hour
    claims: {
      email: user.email,
      roles: user.roles,
    },
  });

  // 6. Store session
  const payload = qauth.validateToken(token);
  await db.query(
    \`INSERT INTO sessions (user_id, token_jti, expires_at)
     VALUES ($1, $2, to_timestamp($3))\`,
    [user.id, payload.jti, payload.exp]
  );

  // 7. Create refresh token
  const refreshToken = crypto.randomUUID();
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await db.query(
    \`INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at)
     VALUES ($1, (SELECT id FROM sessions WHERE token_jti = $2),
             $3, NOW() + INTERVAL '30 days')\`,
    [user.id, payload.jti, refreshHash]
  );

  return { token, refreshToken, user: { id: user.id, email, name } };
}`;

const loginCode = `import { qauth } from './server';
import bcrypt from 'bcrypt';
import { db } from './database';

export async function login(email: string, password: string) {
  // 1. Find user
  const result = await db.query(
    'SELECT id, email, password_hash, roles, display_name FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  const user = result.rows[0];

  // 2. Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // 3. Create QAuth token
  const token = qauth.createToken({
    subject: user.id,
    policyRef: 'urn:qauth:policy:app',
    validitySeconds: 3600,
    claims: {
      email: user.email,
      roles: user.roles,
      name: user.display_name,
    },
  });

  // 4. Store session
  const payload = qauth.validateToken(token);
  await db.query(
    \`INSERT INTO sessions (user_id, token_jti, expires_at)
     VALUES ($1, $2, to_timestamp($3))\`,
    [user.id, payload.jti, payload.exp]
  );

  // 5. Create refresh token
  const refreshToken = crypto.randomUUID();
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await db.query(
    \`INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at)
     VALUES ($1, (SELECT id FROM sessions WHERE token_jti = $2),
             $3, NOW() + INTERVAL '30 days')\`,
    [user.id, payload.jti, refreshHash]
  );

  return { token, refreshToken };
}`;

const middlewareNextCode = `// middleware.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import { QAuthValidator } from '@quantumshield/qauth';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/health'];

// Pre-configure validator with your server's public keys
const validator = new QAuthValidator(publicKeys, {
  issuer: 'https://auth.yourapp.com',
  audience: 'https://api.yourapp.com',
});

export function middleware(request: NextRequest) {
  // Skip public paths
  if (PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Extract token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('QAuth ')) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }
  const token = authHeader.slice(6);

  // Validate token
  try {
    const payload = validator.validate(token);

    // Pass user info to route handlers via headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub);
    response.headers.set('x-user-claims', JSON.stringify(payload.cst));
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export const config = {
  matcher: '/api/:path*',
};`;

const middlewareExpressCode = `// middleware.ts (Express.js)
import { Request, Response, NextFunction } from 'express';
import { QAuthValidator, ProofValidator, TokenPayload } from '@quantumshield/qauth';

const validator = new QAuthValidator(publicKeys, {
  issuer: 'https://auth.yourapp.com',
  audience: 'https://api.yourapp.com',
});

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function qAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('QAuth ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.slice(6);

  try {
    // Validate token
    const payload = validator.validate(token);
    req.user = payload;

    // Optionally validate proof of possession
    const proof = req.headers['x-qauth-proof'] as string;
    if (proof) {
      const clientKey = payload.cst.clientKey as string;
      if (clientKey) {
        const proofValidator = new ProofValidator(
          new Uint8Array(Buffer.from(clientKey, 'hex'))
        );
        const isValid = proofValidator.validate(
          proof, req.method, req.originalUrl, token, req.body
        );
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid proof' });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}`;

const protectedRouteCode = `// app/api/projects/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import { policyEngine } from '@/lib/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  // User info injected by middleware
  const userId = request.headers.get('x-user-id');
  const claims = JSON.parse(request.headers.get('x-user-claims') || '{}');

  // Check policy
  const authResult = policyEngine.evaluate('urn:qauth:policy:app', {
    subject: {
      id: userId!,
      attributes: { role: claims.roles?.[0] },
    },
    resource: { path: 'api/projects' },
    request: { action: 'list' },
  });

  if (authResult.effect !== 'allow') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch user's projects
  const result = await db.query(
    'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return NextResponse.json({ projects: result.rows });
}`;

const tokenRefreshCode = `import { qauth } from './server';
import bcrypt from 'bcrypt';
import { db } from './database';

export async function refreshTokens(refreshToken: string) {
  // 1. Find valid refresh token
  const tokens = await db.query(
    \`SELECT rt.*, s.user_id
     FROM refresh_tokens rt
     JOIN sessions s ON rt.session_id = s.id
     WHERE rt.revoked = false AND rt.expires_at > NOW()\`
  );

  // 2. Find matching token (compare hashes)
  let matchedToken = null;
  for (const rt of tokens.rows) {
    if (await bcrypt.compare(refreshToken, rt.token_hash)) {
      matchedToken = rt;
      break;
    }
  }
  if (!matchedToken) {
    throw new Error('Invalid refresh token');
  }

  // 3. Revoke old refresh token (rotation)
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
    [matchedToken.id]
  );

  // 4. Get user
  const userResult = await db.query(
    'SELECT id, email, roles, display_name FROM users WHERE id = $1',
    [matchedToken.user_id]
  );
  const user = userResult.rows[0];

  // 5. Create new QAuth token
  const newToken = qauth.createToken({
    subject: user.id,
    policyRef: 'urn:qauth:policy:app',
    validitySeconds: 3600,
    claims: { email: user.email, roles: user.roles },
  });

  // 6. Create new session
  const payload = qauth.validateToken(newToken);
  await db.query(
    \`INSERT INTO sessions (user_id, token_jti, expires_at)
     VALUES ($1, $2, to_timestamp($3))\`,
    [user.id, payload.jti, payload.exp]
  );

  // 7. Create new refresh token
  const newRefreshToken = crypto.randomUUID();
  const refreshHash = await bcrypt.hash(newRefreshToken, 10);
  await db.query(
    \`INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at)
     VALUES ($1, (SELECT id FROM sessions WHERE token_jti = $2),
             $3, NOW() + INTERVAL '30 days')\`,
    [user.id, payload.jti, refreshHash]
  );

  return { token: newToken, refreshToken: newRefreshToken };
}`;

const logoutCode = `import { db } from './database';
import { qauth } from './server';

export async function logout(token: string) {
  try {
    // 1. Validate token to get JTI
    const payload = qauth.validateToken(token);

    // 2. Delete session (cascades to refresh tokens)
    await db.query(
      'DELETE FROM sessions WHERE token_jti = $1',
      [payload.jti]
    );

    return { success: true };
  } catch {
    // Token might be expired, still try to clean up
    return { success: true };
  }
}

// Express route example
app.post('/api/auth/logout', qAuthMiddleware, async (req, res) => {
  const token = req.headers.authorization!.slice(6);
  await logout(token);
  res.json({ success: true });
});`;

const expressFullCode = `import express from 'express';
import { QAuthServer, PolicyEngine } from '@quantumshield/qauth';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

// Database
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// QAuth
const qauth = new QAuthServer({
  issuer: 'https://auth.yourapp.com',
  audience: 'https://api.yourapp.com',
});

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('QAuth ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = qauth.validateToken(auth.slice(6));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Signup
app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1,$2,$3) RETURNING *',
    [email, hash, name]
  );
  const user = result.rows[0];
  const token = qauth.createToken({
    subject: user.id,
    policyRef: 'urn:qauth:policy:app',
    claims: { email, roles: user.roles },
  });
  res.json({ token, user: { id: user.id, email, name } });
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = qauth.createToken({
    subject: user.id,
    policyRef: 'urn:qauth:policy:app',
    claims: { email, roles: user.roles },
  });
  res.json({ token });
});

// Protected route
app.get('/api/me', requireAuth, async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE id=$1', [req.user.sub]);
  res.json({ user: result.rows[0] });
});

app.listen(3000, () => console.log('Server running on :3000'));`;

const sections = [
  { id: "architecture", label: "Architecture" },
  { id: "database", label: "Database Schema" },
  { id: "server-setup", label: "Server Setup" },
  { id: "signup", label: "User Signup" },
  { id: "login", label: "User Login" },
  { id: "middleware", label: "Session Middleware" },
  { id: "protected-routes", label: "Protected Routes" },
  { id: "token-refresh", label: "Token Refresh" },
  { id: "logout", label: "Logout" },
  { id: "complete-example", label: "Complete Example" },
];

export default function FullAuthClient() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">
          Full Auth System Guide
        </h1>
        <p className="text-theme-secondary text-lg max-w-2xl">
          Build a production-ready authentication system with QAuth. This tutorial covers
          signup, login, sessions, protected routes, and token refresh.
        </p>
      </div>

      {/* Table of Contents */}
      <div
        className="rounded-2xl p-6 mb-12"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h3 className="font-semibold text-theme mb-4">In this guide</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme transition-colors"
              style={{ background: "var(--surface-hover)" }}
            >
              <span className="text-theme-accent font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <section className="mb-16" id="architecture">
        <h2 className="text-2xl font-bold text-theme mb-3">1. Architecture Overview</h2>
        <p className="text-theme-secondary mb-6">
          A typical QAuth-powered system has three components: browser (with QAuthClient), API server (with QAuthValidator), and auth server (with QAuthServer).
        </p>
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4 justify-center">
            {[
              { name: "Browser", sub: "QAuthClient", desc: "Creates proofs, stores tokens" },
              { name: "API Server", sub: "QAuthValidator", desc: "Validates tokens & proofs" },
              { name: "Auth Server", sub: "QAuthServer", desc: "Issues & refreshes tokens" },
              { name: "Database", sub: "PostgreSQL", desc: "Users, sessions, tokens" },
            ].map((item, idx) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center mb-2 mx-auto"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
                  >
                    <span className="text-theme-accent font-mono text-xs font-bold">{item.sub}</span>
                  </div>
                  <p className="text-theme font-medium text-sm">{item.name}</p>
                  <p className="text-theme-muted text-xs">{item.desc}</p>
                </div>
                {idx < 3 && (
                  <svg className="w-6 h-6 text-theme-muted hidden md:block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Database Schema */}
      <section className="mb-16" id="database">
        <h2 className="text-2xl font-bold text-theme mb-3">2. Database Schema</h2>
        <p className="text-theme-secondary mb-6">
          Three tables: users, sessions (linked to token JTI), and refresh tokens with rotation support.
        </p>
        <CodePreview code={dbSchemaSQL} language="SQL" fileName="schema.sql" />
      </section>

      {/* Server Setup */}
      <section className="mb-16" id="server-setup">
        <h2 className="text-2xl font-bold text-theme mb-3">3. Server Setup</h2>
        <p className="text-theme-secondary mb-6">
          Initialize QAuthServer once at startup. Share public keys with API servers.
        </p>
        <CodePreview code={serverSetupCode} language="TypeScript" fileName="lib/server.ts" />
      </section>

      {/* User Signup */}
      <section className="mb-16" id="signup">
        <h2 className="text-2xl font-bold text-theme mb-3">4. User Signup</h2>
        <p className="text-theme-secondary mb-6">
          Hash password with bcrypt, create user record, issue QAuth token, create session and refresh token.
        </p>
        <CodePreview code={signupCode} language="TypeScript" fileName="lib/auth/signup.ts" />
      </section>

      {/* User Login */}
      <section className="mb-16" id="login">
        <h2 className="text-2xl font-bold text-theme mb-3">5. User Login</h2>
        <p className="text-theme-secondary mb-6">
          Verify credentials, then issue a fresh token and refresh token. Same flow as signup minus user creation.
        </p>
        <CodePreview code={loginCode} language="TypeScript" fileName="lib/auth/login.ts" />
      </section>

      {/* Session Middleware */}
      <section className="mb-16" id="middleware">
        <h2 className="text-2xl font-bold text-theme mb-3">6. Session Middleware</h2>
        <p className="text-theme-secondary mb-6">
          Intercept every API request, validate the QAuth token, and pass user info to route handlers.
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">Next.js Middleware</h3>
            <CodePreview code={middlewareNextCode} language="TypeScript" fileName="middleware.ts" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">Express.js Middleware</h3>
            <CodePreview code={middlewareExpressCode} language="TypeScript" fileName="middleware.ts" />
          </div>
        </div>
      </section>

      {/* Protected Routes */}
      <section className="mb-16" id="protected-routes">
        <h2 className="text-2xl font-bold text-theme mb-3">7. Protected API Routes</h2>
        <p className="text-theme-secondary mb-6">
          Validate the token (done by middleware), extract user info, then check policy authorization.
        </p>
        <CodePreview code={protectedRouteCode} language="TypeScript" fileName="app/api/projects/route.ts" />
      </section>

      {/* Token Refresh */}
      <section className="mb-16" id="token-refresh">
        <h2 className="text-2xl font-bold text-theme mb-3">8. Token Refresh</h2>
        <p className="text-theme-secondary mb-6">
          Refresh token rotation: the old refresh token is revoked, and a new pair (access + refresh) is issued.
          This detects token theft — if a revoked token is reused, invalidate all sessions for that user.
        </p>
        <CodePreview code={tokenRefreshCode} language="TypeScript" fileName="lib/auth/refresh.ts" />
      </section>

      {/* Logout */}
      <section className="mb-16" id="logout">
        <h2 className="text-2xl font-bold text-theme mb-3">9. Logout</h2>
        <p className="text-theme-secondary mb-6">
          Delete the session record (cascades to refresh tokens). The access token remains valid until expiry
          (max 1 hour), but the session cannot be refreshed.
        </p>
        <CodePreview code={logoutCode} language="TypeScript" fileName="lib/auth/logout.ts" />
      </section>

      {/* Complete Example */}
      <section className="mb-16" id="complete-example">
        <h2 className="text-2xl font-bold text-theme mb-3">10. Complete Express.js Server</h2>
        <p className="text-theme-secondary mb-6">
          A minimal but complete Express.js server with QAuth. Copy-paste ready.
        </p>
        <CodePreview code={expressFullCode} language="TypeScript" fileName="server.ts" />
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold text-theme mb-6">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/qauth/docs/api"
            className="rounded-xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold text-theme mb-1">API Reference</h3>
            <p className="text-theme-secondary text-sm">Every method, parameter, and type in the SDK.</p>
          </Link>
          <Link
            href="/qauth/docs/policy"
            className="rounded-xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold text-theme mb-1">Policy Engine Guide</h3>
            <p className="text-theme-secondary text-sm">Advanced authorization patterns: RBAC, multi-tenant, HIPAA.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
