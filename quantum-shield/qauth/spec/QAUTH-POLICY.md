# QAuth Policy Language Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-30

---

## Abstract

This document specifies the QAuth Policy Language (QPL), a fine-grained authorization policy language for the QuantumAuth protocol. QPL replaces OAuth scopes with rich, context-aware policies that support RBAC, ABAC, and ReBAC patterns.

---

## 1. Introduction

### 1.1 Problem with OAuth Scopes

OAuth scopes suffer from "scope explosion" - as applications grow, the number of scopes becomes unmanageable:

```
read:users write:users delete:users
read:projects write:projects delete:projects
read:projects:123 write:projects:123
admin:users admin:projects
...
```

### 1.2 QPL Solution

QPL uses **policy references** in tokens, with policies stored and fetched separately:

**Token contains:**
```json
{
  "pol": "urn:qauth:policy:abc123",
  "pol_ver": "2026-01-30"
}
```

**Policy document (fetched separately):**
```json
{
  "id": "urn:qauth:policy:abc123",
  "rules": [...]
}
```

### 1.3 Benefits

1. **Tokens stay small** - Only policy reference, not full permissions
2. **Policies are dynamic** - Update without re-issuing tokens
3. **Context-aware** - Time, location, device conditions
4. **Unified model** - RBAC, ABAC, ReBAC in one system

---

## 2. Policy Document Structure

### 2.1 Top-Level Structure

```json
{
  "id": "urn:qauth:policy:12345",
  "version": "2026-01-30",
  "name": "Standard User Access",
  "description": "Default policy for authenticated users",
  "issuer": "https://auth.example.com",
  "valid_from": "2026-01-30T00:00:00Z",
  "valid_until": "2027-01-30T00:00:00Z",
  "rules": [...],
  "defaults": {...},
  "metadata": {...}
}
```

### 2.2 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique policy identifier (URN format) |
| `version` | string | Yes | Policy version (ISO date recommended) |
| `name` | string | No | Human-readable name |
| `description` | string | No | Policy description |
| `issuer` | string | Yes | Issuing authority URL |
| `valid_from` | datetime | No | Policy activation time |
| `valid_until` | datetime | No | Policy expiration time |
| `rules` | array | Yes | Authorization rules |
| `defaults` | object | No | Default behavior settings |
| `metadata` | object | No | Custom metadata |

---

## 3. Rules

### 3.1 Rule Structure

```json
{
  "id": "rule-001",
  "effect": "allow",
  "resources": ["projects/*"],
  "actions": ["read", "list"],
  "conditions": {...},
  "priority": 100
}
```

### 3.2 Rule Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Rule identifier |
| `effect` | string | Yes | "allow" or "deny" |
| `resources` | array | Yes | Resource patterns |
| `actions` | array | Yes | Permitted actions |
| `conditions` | object | No | Contextual conditions |
| `priority` | integer | No | Rule priority (higher = first) |

### 3.3 Effect

- **allow**: Grant access if rule matches
- **deny**: Deny access if rule matches (takes precedence)

### 3.4 Resources

Resources use glob-style patterns:

| Pattern | Matches |
|---------|---------|
| `projects/123` | Exactly `projects/123` |
| `projects/*` | Any single segment under projects |
| `projects/**` | Any path under projects |
| `projects/*/files/*` | Files in any project |
| `{projects,repos}/*` | Either projects or repos |

### 3.5 Actions

Standard actions:

| Action | Description |
|--------|-------------|
| `read` | Read/view resource |
| `write` | Create or update resource |
| `delete` | Delete resource |
| `list` | List resources in collection |
| `admin` | Administrative operations |
| `*` | All actions (wildcard) |

Custom actions are supported: `approve`, `publish`, `share`, etc.

---

## 4. Conditions

### 4.1 Condition Structure

Conditions are AND-combined by default:

```json
{
  "conditions": {
    "time": {...},
    "ip": {...},
    "device": {...},
    "mfa": {...},
    "custom": {...}
  }
}
```

### 4.2 Time Conditions

```json
{
  "time": {
    "after": "09:00",
    "before": "18:00",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "timezone": "America/New_York",
    "not_holidays": true
  }
}
```

| Field | Description |
|-------|-------------|
| `after` | Time of day (HH:MM) |
| `before` | Time of day (HH:MM) |
| `days` | Days of week (lowercase) |
| `timezone` | IANA timezone |
| `not_holidays` | Exclude holidays (requires config) |

### 4.3 IP Conditions

```json
{
  "ip": {
    "allow_ranges": ["10.0.0.0/8", "192.168.0.0/16"],
    "deny_ranges": ["10.0.99.0/24"],
    "require_vpn": true,
    "geo_allow": ["US", "CA", "GB"],
    "geo_deny": ["RU", "CN"]
  }
}
```

### 4.4 Device Conditions

```json
{
  "device": {
    "types": ["desktop", "mobile"],
    "os": ["windows", "macos", "ios", "android"],
    "managed": true,
    "attestation_required": true,
    "min_security_level": 3
  }
}
```

### 4.5 MFA Conditions

```json
{
  "mfa": {
    "required": true,
    "methods": ["totp", "webauthn", "passkey"],
    "max_age_minutes": 60,
    "step_up_for": ["delete", "admin"]
  }
}
```

### 4.6 Custom Conditions

```json
{
  "custom": {
    "department": {"in": ["engineering", "security"]},
    "clearance_level": {"gte": 3},
    "training_completed": {"eq": true},
    "risk_score": {"lt": 0.7}
  }
}
```

Operators:
- `eq`: Equal
- `ne`: Not equal
- `gt`, `gte`: Greater than (or equal)
- `lt`, `lte`: Less than (or equal)
- `in`: In array
- `not_in`: Not in array
- `contains`: String contains
- `matches`: Regex match

---

## 5. Advanced Patterns

### 5.1 Role-Based Access Control (RBAC)

```json
{
  "id": "urn:qauth:policy:rbac-admin",
  "rules": [
    {
      "effect": "allow",
      "resources": ["**"],
      "actions": ["*"],
      "conditions": {
        "custom": {
          "role": {"in": ["admin", "superadmin"]}
        }
      }
    }
  ]
}
```

### 5.2 Attribute-Based Access Control (ABAC)

```json
{
  "id": "urn:qauth:policy:abac-confidential",
  "rules": [
    {
      "effect": "allow",
      "resources": ["documents/confidential/**"],
      "actions": ["read"],
      "conditions": {
        "custom": {
          "clearance_level": {"gte": 3},
          "department": {"eq": "{{resource.department}}"}
        },
        "device": {
          "managed": true
        }
      }
    }
  ]
}
```

### 5.3 Relationship-Based Access Control (ReBAC)

```json
{
  "id": "urn:qauth:policy:rebac-owner",
  "rules": [
    {
      "effect": "allow",
      "resources": ["projects/*"],
      "actions": ["read", "write", "delete"],
      "conditions": {
        "relationship": {
          "subject_is": "owner",
          "of_resource": true
        }
      }
    },
    {
      "effect": "allow",
      "resources": ["projects/*"],
      "actions": ["read"],
      "conditions": {
        "relationship": {
          "subject_is": "member",
          "of_resource": true
        }
      }
    }
  ]
}
```

### 5.4 Temporal Access

```json
{
  "id": "urn:qauth:policy:contractor",
  "valid_from": "2026-02-01T00:00:00Z",
  "valid_until": "2026-03-01T00:00:00Z",
  "rules": [
    {
      "effect": "allow",
      "resources": ["projects/project-x/**"],
      "actions": ["read", "write"],
      "conditions": {
        "time": {
          "after": "09:00",
          "before": "17:00",
          "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
          "timezone": "America/Los_Angeles"
        }
      }
    }
  ]
}
```

### 5.5 Emergency Access (Break Glass)

```json
{
  "id": "urn:qauth:policy:emergency",
  "rules": [
    {
      "effect": "allow",
      "resources": ["**"],
      "actions": ["*"],
      "conditions": {
        "custom": {
          "emergency_declared": {"eq": true},
          "incident_id": {"ne": null}
        },
        "mfa": {
          "required": true,
          "methods": ["webauthn"]
        }
      },
      "audit": {
        "level": "critical",
        "notify": ["security@example.com"]
      }
    }
  ]
}
```

---

## 6. Policy Resolution

### 6.1 Algorithm

```
1. Collect all matching rules for (resource, action)
2. Sort rules by priority (descending)
3. Evaluate conditions for each rule
4. Apply first matching rule
5. If explicit "deny" matches → DENY
6. If explicit "allow" matches → ALLOW
7. If no rules match → apply default (default: DENY)
```

### 6.2 Priority

Higher priority rules are evaluated first:

```json
{
  "rules": [
    {
      "priority": 1000,
      "effect": "deny",
      "resources": ["secrets/**"],
      "actions": ["*"],
      "comment": "Deny all access to secrets by default"
    },
    {
      "priority": 500,
      "effect": "allow",
      "resources": ["secrets/my-team/**"],
      "actions": ["read"],
      "conditions": {...},
      "comment": "Allow team to read their secrets"
    }
  ]
}
```

### 6.3 Defaults

```json
{
  "defaults": {
    "effect": "deny",
    "audit_unmatched": true,
    "require_explicit_allow": true
  }
}
```

---

## 7. Policy References

### 7.1 URN Format

```
urn:qauth:policy:<issuer-namespace>:<policy-id>

Examples:
urn:qauth:policy:acme:admin
urn:qauth:policy:acme:user:readonly
urn:qauth:policy:example.com:api:standard
```

### 7.2 Versioning

Policies can be versioned:

```
urn:qauth:policy:acme:admin@2026-01-30
urn:qauth:policy:acme:admin@latest
```

### 7.3 Policy Fetching

Resource servers fetch policies from the policy endpoint:

```http
GET /policies/acme:admin HTTP/1.1
Host: auth.example.com
Authorization: QAuth <service-token>
Accept: application/json
If-None-Match: "abc123"
```

Response includes caching headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "abc123"
Cache-Control: max-age=300, must-revalidate

{
  "id": "urn:qauth:policy:acme:admin",
  ...
}
```

---

## 8. Policy Inheritance

### 8.1 Extending Policies

```json
{
  "id": "urn:qauth:policy:power-user",
  "extends": "urn:qauth:policy:standard-user",
  "rules": [
    {
      "effect": "allow",
      "resources": ["analytics/**"],
      "actions": ["read", "export"]
    }
  ]
}
```

### 8.2 Resolution Order

1. Child policy rules (higher priority)
2. Parent policy rules
3. Grandparent policy rules
4. ...
5. Default policy

---

## 9. Context Variables

### 9.1 Available Variables

| Variable | Description |
|----------|-------------|
| `{{subject.id}}` | User/subject identifier |
| `{{subject.email}}` | User email |
| `{{subject.roles}}` | User roles array |
| `{{subject.groups}}` | User groups array |
| `{{resource.id}}` | Resource identifier |
| `{{resource.owner}}` | Resource owner |
| `{{resource.type}}` | Resource type |
| `{{request.method}}` | HTTP method |
| `{{request.ip}}` | Client IP |
| `{{request.time}}` | Request timestamp |
| `{{env.region}}` | Deployment region |

### 9.2 Usage

```json
{
  "conditions": {
    "custom": {
      "owner": {"eq": "{{subject.id}}"}
    }
  }
}
```

---

## 10. Audit and Logging

### 10.1 Rule-Level Audit

```json
{
  "effect": "allow",
  "resources": ["admin/**"],
  "actions": ["*"],
  "audit": {
    "level": "high",
    "log_request": true,
    "log_response": false,
    "notify": ["security@example.com"],
    "alert_on_deny": true
  }
}
```

### 10.2 Policy-Level Audit

```json
{
  "metadata": {
    "audit": {
      "log_all_decisions": true,
      "retention_days": 365,
      "compliance": ["SOC2", "HIPAA"]
    }
  }
}
```

---

## 11. Schema

### 11.1 JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://qauth.io/schemas/policy-v1.json",
  "type": "object",
  "required": ["id", "version", "issuer", "rules"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^urn:qauth:policy:.+"
    },
    "version": {"type": "string"},
    "name": {"type": "string"},
    "description": {"type": "string"},
    "issuer": {"type": "string", "format": "uri"},
    "valid_from": {"type": "string", "format": "date-time"},
    "valid_until": {"type": "string", "format": "date-time"},
    "extends": {"type": "string"},
    "rules": {
      "type": "array",
      "items": {"$ref": "#/$defs/rule"}
    },
    "defaults": {"$ref": "#/$defs/defaults"},
    "metadata": {"type": "object"}
  },
  "$defs": {
    "rule": {
      "type": "object",
      "required": ["effect", "resources", "actions"],
      "properties": {
        "id": {"type": "string"},
        "effect": {"enum": ["allow", "deny"]},
        "resources": {
          "type": "array",
          "items": {"type": "string"}
        },
        "actions": {
          "type": "array",
          "items": {"type": "string"}
        },
        "conditions": {"$ref": "#/$defs/conditions"},
        "priority": {"type": "integer"},
        "audit": {"$ref": "#/$defs/audit"}
      }
    },
    "conditions": {
      "type": "object",
      "properties": {
        "time": {"type": "object"},
        "ip": {"type": "object"},
        "device": {"type": "object"},
        "mfa": {"type": "object"},
        "relationship": {"type": "object"},
        "custom": {"type": "object"}
      }
    },
    "defaults": {
      "type": "object",
      "properties": {
        "effect": {"enum": ["allow", "deny"]},
        "audit_unmatched": {"type": "boolean"},
        "require_explicit_allow": {"type": "boolean"}
      }
    },
    "audit": {
      "type": "object",
      "properties": {
        "level": {"enum": ["low", "medium", "high", "critical"]},
        "log_request": {"type": "boolean"},
        "log_response": {"type": "boolean"},
        "notify": {
          "type": "array",
          "items": {"type": "string"}
        },
        "alert_on_deny": {"type": "boolean"}
      }
    }
  }
}
```

---

## 12. Implementation Notes

### 12.1 Performance

- **Cache policies** with appropriate TTL (5-15 minutes)
- **Pre-compile** glob patterns to regex
- **Index rules** by resource prefix for fast lookup
- **Lazy-load** extended policies

### 12.2 Security

- **Validate all policies** against schema before use
- **Sign policies** to prevent tampering
- **Audit policy changes** in immutable log
- **Version policies** for rollback capability

---

## 13. References

- [XACML 3.0] eXtensible Access Control Markup Language
- [OPA] Open Policy Agent
- [Cedar] Amazon Cedar Policy Language
- [Google Zanzibar] Consistent, Global Authorization System

---

**Authors**: QuantumShield Team
**Copyright**: 2026 QuantumShield. This specification is released under CC BY 4.0.
