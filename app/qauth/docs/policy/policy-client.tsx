"use client";

import { CodePreview } from "@/components/quantum-shield/CodePreview";
import Link from "next/link";

const policyStructureCode = `{
  "id": "urn:qauth:policy:api-v2",
  "version": "2026-01-30",
  "issuer": "https://auth.example.com",
  "name": "API Access Policy",
  "description": "Controls access to the v2 API",
  "rules": [
    {
      "id": "allow-read",
      "effect": "allow",
      "resources": ["api/v2/projects/*", "api/v2/users/*"],
      "actions": ["read", "list"],
      "priority": 0
    },
    {
      "id": "admin-full-access",
      "effect": "allow",
      "resources": ["api/v2/**"],
      "actions": ["*"],
      "conditions": {
        "custom": {
          "role": { "in": ["admin", "superadmin"] }
        }
      },
      "priority": 10
    },
    {
      "id": "deny-dangerous",
      "effect": "deny",
      "resources": ["api/v2/system/**"],
      "actions": ["delete", "purge"],
      "priority": 100
    }
  ]
}`;

const globPatternsCode = `// Exact match
"api/users"          // matches only "api/users"

// Single wildcard (*) — matches one path segment
"api/users/*"        // matches "api/users/123", NOT "api/users/123/posts"
"api/*/settings"     // matches "api/users/settings", "api/teams/settings"

// Double wildcard (**) — matches any depth
"api/users/**"       // matches "api/users/123", "api/users/123/posts/456"
"admin/**"           // matches everything under "admin/"

// Combining patterns
["api/users/*", "api/teams/*"]   // matches users OR teams (one level)
["**"]                            // matches everything (use with caution)`;

const conditionsTimeCode = `{
  "id": "business-hours-only",
  "effect": "allow",
  "resources": ["api/billing/**"],
  "actions": ["*"],
  "conditions": {
    "time": {
      "after": "09:00",
      "before": "17:00",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "timezone": "America/New_York"
    }
  }
}`;

const conditionsIpCode = `{
  "id": "office-network-only",
  "effect": "allow",
  "resources": ["api/admin/**"],
  "actions": ["*"],
  "conditions": {
    "ip": {
      "allow_ranges": ["10.0.0.0/8", "172.16.0.0/12"],
      "deny_ranges": ["10.0.99.0/24"]
    }
  }
}`;

const conditionsMfaCode = `{
  "id": "sensitive-operations",
  "effect": "allow",
  "resources": ["api/billing/payment-methods/**"],
  "actions": ["create", "update", "delete"],
  "conditions": {
    "mfa": {
      "required": true,
      "methods": ["totp", "webauthn"]
    }
  }
}`;

const conditionsCustomCode = `{
  "id": "premium-feature",
  "effect": "allow",
  "resources": ["api/analytics/**"],
  "actions": ["read", "export"],
  "conditions": {
    "custom": {
      "plan": { "in": ["premium", "enterprise"] },
      "verified": { "eq": true }
    }
  }
}`;

const evaluationCode = `import { PolicyEngine } from '@quantumshield/qauth';

const engine = new PolicyEngine();

engine.loadPolicy({
  id: 'urn:qauth:policy:app',
  version: '1.0',
  issuer: 'https://auth.example.com',
  rules: [
    // Priority 100: Explicit deny (always wins)
    {
      id: 'deny-system',
      effect: 'deny',
      resources: ['api/system/**'],
      actions: ['*'],
      priority: 100,
    },
    // Priority 10: Admin access
    {
      id: 'admin-access',
      effect: 'allow',
      resources: ['api/**'],
      actions: ['*'],
      conditions: { custom: { role: { in: ['admin'] } } },
      priority: 10,
    },
    // Priority 0: Default read access
    {
      id: 'default-read',
      effect: 'allow',
      resources: ['api/public/**'],
      actions: ['read'],
      priority: 0,
    },
  ],
});

// Evaluation order:
// 1. Sort rules by priority (100 → 10 → 0)
// 2. Check each rule against the context
// 3. First matching rule determines the effect
// 4. If no rule matches → default DENY`;

const rbacCode = `const engine = new PolicyEngine();

// Role-based access control
engine.loadPolicy({
  id: 'urn:qauth:policy:rbac',
  version: '1.0',
  issuer: 'https://auth.example.com',
  rules: [
    // Viewers can read
    {
      id: 'viewer-read',
      effect: 'allow',
      resources: ['api/**'],
      actions: ['read', 'list'],
      conditions: { custom: { role: { in: ['viewer', 'editor', 'admin'] } } },
    },
    // Editors can create and update
    {
      id: 'editor-write',
      effect: 'allow',
      resources: ['api/**'],
      actions: ['create', 'update'],
      conditions: { custom: { role: { in: ['editor', 'admin'] } } },
    },
    // Admins can delete
    {
      id: 'admin-delete',
      effect: 'allow',
      resources: ['api/**'],
      actions: ['delete'],
      conditions: { custom: { role: { in: ['admin'] } } },
    },
  ],
});

// Usage
const result = engine.evaluate('urn:qauth:policy:rbac', {
  subject: { id: 'user-1', attributes: { role: 'editor' } },
  resource: { path: 'api/posts/123' },
  request: { action: 'update' },
});
// result.effect === 'allow'`;

const multiTenantCode = `const engine = new PolicyEngine();

// Multi-tenant SaaS policy
engine.loadPolicy({
  id: 'urn:qauth:policy:saas',
  version: '1.0',
  issuer: 'https://auth.saas.com',
  rules: [
    // Users can only access their own tenant's data
    {
      id: 'tenant-isolation',
      effect: 'allow',
      resources: ['api/tenants/*/**'],
      actions: ['read', 'list', 'create', 'update'],
      conditions: {
        custom: {
          tenant_member: { eq: true },
        },
      },
    },
    // Tenant admins can manage tenant settings
    {
      id: 'tenant-admin',
      effect: 'allow',
      resources: ['api/tenants/*/settings/**'],
      actions: ['*'],
      conditions: {
        custom: {
          tenant_role: { in: ['owner', 'admin'] },
        },
      },
      priority: 10,
    },
    // Platform admins can access everything
    {
      id: 'platform-admin',
      effect: 'allow',
      resources: ['**'],
      actions: ['*'],
      conditions: {
        custom: {
          platform_role: { in: ['superadmin'] },
        },
      },
      priority: 100,
    },
  ],
});`;

const hipaaCode = `const engine = new PolicyEngine();

// HIPAA-compliant healthcare policy
engine.loadPolicy({
  id: 'urn:qauth:policy:hipaa',
  version: '1.0',
  issuer: 'https://auth.hospital.com',
  rules: [
    // Doctors can access patient records during business hours from hospital network
    {
      id: 'doctor-patient-access',
      effect: 'allow',
      resources: ['api/patients/*/records/**'],
      actions: ['read'],
      conditions: {
        custom: { role: { in: ['doctor', 'specialist'] } },
        time: {
          after: '06:00',
          before: '22:00',
          timezone: 'America/New_York',
        },
        ip: {
          allow_ranges: ['10.1.0.0/16'],
        },
      },
    },
    // Writing records requires MFA
    {
      id: 'write-records-mfa',
      effect: 'allow',
      resources: ['api/patients/*/records/**'],
      actions: ['create', 'update'],
      conditions: {
        custom: { role: { in: ['doctor'] } },
        mfa: {
          required: true,
          methods: ['totp', 'webauthn'],
        },
      },
      priority: 10,
    },
    // Emergency access (highest priority, breaks glass)
    {
      id: 'emergency-access',
      effect: 'allow',
      resources: ['api/patients/**'],
      actions: ['*'],
      conditions: {
        custom: {
          emergency: { eq: true },
          role: { in: ['doctor', 'nurse', 'emt'] },
        },
      },
      priority: 1000,
    },
  ],
});`;

const sections = [
  { id: "why-policies", label: "Why Policies?" },
  { id: "structure", label: "Policy Structure" },
  { id: "glob-patterns", label: "Glob Patterns" },
  { id: "conditions", label: "Conditions" },
  { id: "evaluation", label: "Evaluation Flow" },
  { id: "rbac", label: "RBAC Example" },
  { id: "multi-tenant", label: "Multi-Tenant SaaS" },
  { id: "hipaa", label: "Healthcare / HIPAA" },
];

export default function PolicyClient() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">
          Policy Engine Guide
        </h1>
        <p className="text-theme-secondary text-lg max-w-2xl">
          Replace OAuth scopes with fine-grained policy documents. Support RBAC, ABAC, time-based,
          IP-based, and MFA conditions in a single authorization model.
        </p>
      </div>

      {/* TOC */}
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

      {/* Why Policies */}
      <section className="mb-16" id="why-policies">
        <h2 className="text-2xl font-bold text-theme mb-3">1. Why Policies Instead of Scopes?</h2>
        <p className="text-theme-secondary mb-6">
          OAuth scopes are strings like <code className="text-theme-accent">read:projects write:users</code>.
          They seem simple, but they break down quickly in real applications.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            <h3 className="font-semibold text-red-400 mb-3">OAuth Scopes</h3>
            <ul className="space-y-2 text-theme-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400">x</span>
                <span>Scope explosion: hundreds of permission strings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">x</span>
                <span>No time-based or IP-based conditions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">x</span>
                <span>Token size grows with permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">x</span>
                <span>No inheritance or wildcard matching</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">x</span>
                <span>Changes require re-issuing tokens</span>
              </li>
            </ul>
          </div>
          <div
            className="rounded-xl p-5"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
          >
            <h3 className="font-semibold text-theme-accent mb-3">QAuth Policies</h3>
            <ul className="space-y-2 text-theme-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-theme-accent">+</span>
                <span>One policy reference per token</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-theme-accent">+</span>
                <span>Time, IP, MFA, and custom conditions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-theme-accent">+</span>
                <span>Token size stays constant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-theme-accent">+</span>
                <span>Glob patterns for flexible matching</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-theme-accent">+</span>
                <span>Update policies without re-issuing tokens</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Policy Structure */}
      <section className="mb-16" id="structure">
        <h2 className="text-2xl font-bold text-theme mb-3">2. Policy Document Structure</h2>
        <p className="text-theme-secondary mb-6">
          A policy document is a JSON object with an ID, version, and a list of rules.
          Rules are evaluated in priority order (highest first).
        </p>
        <CodePreview code={policyStructureCode} language="JSON" fileName="policy.json" />
      </section>

      {/* Glob Patterns */}
      <section className="mb-16" id="glob-patterns">
        <h2 className="text-2xl font-bold text-theme mb-3">3. Resource Patterns (Globs)</h2>
        <p className="text-theme-secondary mb-6">
          Resources use glob patterns. <code className="text-theme-accent">*</code> matches a single path segment,{" "}
          <code className="text-theme-accent">**</code> matches any depth.
        </p>
        <CodePreview code={globPatternsCode} language="TypeScript" fileName="patterns.ts" />
        <div
          className="rounded-xl p-5 mt-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h4 className="font-semibold text-theme mb-3">Action Matching</h4>
          <p className="text-theme-secondary text-sm mb-3">
            Actions are matched exactly or with <code className="text-theme-accent">*</code> (all actions):
          </p>
          <ul className="space-y-1 text-theme-secondary text-sm">
            <li><code className="text-theme-accent">[&quot;read&quot;]</code> — only &quot;read&quot; action</li>
            <li><code className="text-theme-accent">[&quot;read&quot;, &quot;list&quot;]</code> — &quot;read&quot; or &quot;list&quot;</li>
            <li><code className="text-theme-accent">[&quot;*&quot;]</code> — any action</li>
          </ul>
        </div>
      </section>

      {/* Conditions */}
      <section className="mb-16" id="conditions">
        <h2 className="text-2xl font-bold text-theme mb-3">4. Conditions</h2>
        <p className="text-theme-secondary mb-6">
          Rules can have conditions that must all be met for the rule to match. Four condition types are supported.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">Time-Based Conditions</h3>
            <p className="text-theme-secondary text-sm mb-4">
              Restrict access to specific hours and days. Useful for business-hours-only operations.
            </p>
            <CodePreview code={conditionsTimeCode} language="JSON" fileName="time-condition.json" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">IP-Based Conditions</h3>
            <p className="text-theme-secondary text-sm mb-4">
              Restrict access to specific CIDR ranges. Combine with allow and deny lists.
            </p>
            <CodePreview code={conditionsIpCode} language="JSON" fileName="ip-condition.json" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">MFA Conditions</h3>
            <p className="text-theme-secondary text-sm mb-4">
              Require multi-factor authentication for sensitive operations.
            </p>
            <CodePreview code={conditionsMfaCode} language="JSON" fileName="mfa-condition.json" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-theme mb-3">Custom Conditions</h3>
            <p className="text-theme-secondary text-sm mb-4">
              Match against any attribute on the subject. Supports <code className="text-theme-accent">in</code> (array membership) and <code className="text-theme-accent">eq</code> (exact equality).
            </p>
            <CodePreview code={conditionsCustomCode} language="JSON" fileName="custom-condition.json" />
          </div>
        </div>
      </section>

      {/* Evaluation Flow */}
      <section className="mb-16" id="evaluation">
        <h2 className="text-2xl font-bold text-theme mb-3">5. Evaluation Flow</h2>
        <p className="text-theme-secondary mb-6">
          The policy engine follows a simple, predictable evaluation flow.
        </p>

        {/* Flow diagram */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="space-y-4">
            {[
              { step: "1", title: "Sort rules by priority", desc: "Higher priority numbers are evaluated first" },
              { step: "2", title: "Match resource pattern", desc: "Check if the resource path matches any rule's glob patterns" },
              { step: "3", title: "Match action", desc: "Check if the requested action is in the rule's actions list" },
              { step: "4", title: "Evaluate conditions", desc: "All conditions must pass (AND logic)" },
              { step: "5", title: "Return first match", desc: "The first matching rule determines allow or deny" },
              { step: "6", title: "Default deny", desc: "If no rule matches, access is denied" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-theme text-sm">{item.title}</h4>
                  <p className="text-theme-secondary text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CodePreview code={evaluationCode} language="TypeScript" fileName="evaluation.ts" />
      </section>

      {/* RBAC Example */}
      <section className="mb-16" id="rbac">
        <h2 className="text-2xl font-bold text-theme mb-3">6. Real-World: RBAC</h2>
        <p className="text-theme-secondary mb-6">
          Classic role-based access control with viewer, editor, and admin roles.
        </p>
        <CodePreview code={rbacCode} language="TypeScript" fileName="rbac-policy.ts" />
      </section>

      {/* Multi-Tenant SaaS */}
      <section className="mb-16" id="multi-tenant">
        <h2 className="text-2xl font-bold text-theme mb-3">7. Real-World: Multi-Tenant SaaS</h2>
        <p className="text-theme-secondary mb-6">
          Tenant isolation with per-tenant roles and platform admin override.
        </p>
        <CodePreview code={multiTenantCode} language="TypeScript" fileName="saas-policy.ts" />
      </section>

      {/* HIPAA */}
      <section className="mb-16" id="hipaa">
        <h2 className="text-2xl font-bold text-theme mb-3">8. Real-World: Healthcare / HIPAA</h2>
        <p className="text-theme-secondary mb-6">
          HIPAA-compliant policy combining role, time, IP, and MFA conditions with emergency break-glass access.
        </p>
        <CodePreview code={hipaaCode} language="TypeScript" fileName="hipaa-policy.ts" />
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
            <p className="text-theme-secondary text-sm">PolicyEngine class methods and all types.</p>
          </Link>
          <Link
            href="/qauth/docs/full-auth"
            className="rounded-xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold text-theme mb-1">Full Auth System Guide</h3>
            <p className="text-theme-secondary text-sm">See policies in action with a complete auth system.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
