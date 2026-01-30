# QAuth Go SDK

[![Go Reference](https://pkg.go.dev/badge/github.com/Tushar010402/qauth-go.svg)](https://pkg.go.dev/github.com/Tushar010402/qauth-go)
[![Go 1.21+](https://img.shields.io/badge/go-1.21+-blue.svg)](https://golang.org/dl/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Go SDK for QuantumAuth - next-generation authentication with post-quantum security.

## Installation

```bash
go get github.com/Tushar010402/qauth-go
```

## Quick Start

```go
package main

import (
	"fmt"
	"log"

	"github.com/Tushar010402/qauth-go/qauth"
)

func main() {
	// Create a QAuth server
	server, err := qauth.NewServer(qauth.ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		log.Fatal(err)
	}

	// Create a token
	token, err := server.CreateToken(qauth.TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
		Claims: map[string]interface{}{
			"email": "user@example.com",
			"roles": []string{"user", "premium"},
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Token:", token)

	// Validate the token
	payload, err := server.ValidateToken(token)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Subject: %s\n", string(payload.Sub))
	fmt.Printf("Expires: %d\n", payload.Exp)
}
```

## Client-Side Usage

```go
package main

import (
	"fmt"
	"net/http"

	"github.com/Tushar010402/qauth-go/qauth"
)

func main() {
	// Create a client instance (generates a new keypair)
	client := qauth.NewClient()

	// Get the client's public key (send to server during auth)
	publicKey := client.PublicKey()
	fmt.Printf("Public Key: %x\n", publicKey)

	// Create proof of possession for API request
	proof, err := client.CreateProof("GET", "/api/resource", nil, token)
	if err != nil {
		log.Fatal(err)
	}

	// Make API request with token and proof
	req, _ := http.NewRequest("GET", "https://api.example.com/resource", nil)
	req.Header.Set("Authorization", "QAuth "+token)
	req.Header.Set("X-QAuth-Proof", proof)
}
```

## Policy Engine

```go
package main

import (
	"fmt"

	"github.com/Tushar010402/qauth-go/qauth"
)

func main() {
	engine := qauth.NewPolicyEngine()

	// Load a policy
	engine.LoadPolicy(&qauth.Policy{
		ID:      "urn:qauth:policy:api-access",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []qauth.PolicyRule{
			{
				ID:        "read-projects",
				Effect:    qauth.EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read", "list"},
			},
		},
	})

	// Evaluate authorization
	result, err := engine.Evaluate("urn:qauth:policy:api-access", &qauth.EvaluationContext{
		Subject: qauth.SubjectContext{
			ID: "user-123",
		},
		Resource: qauth.ResourceContext{
			Path: "projects/456",
		},
		Request: qauth.RequestContext{
			Action: "read",
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	if result.Effect == qauth.EffectAllow {
		fmt.Println("Access granted")
	} else {
		fmt.Println("Access denied")
	}
}
```

## HTTP Middleware

```go
package main

import (
	"net/http"

	"github.com/Tushar010402/qauth-go/qauth"
)

func QAuthMiddleware(server *qauth.Server) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if len(auth) < 7 || auth[:6] != "QAuth " {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			token := auth[6:]
			payload, err := server.ValidateToken(token)
			if err != nil {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Add payload to context
			ctx := context.WithValue(r.Context(), "user", payload)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

## Why QAuth over JWT?

| JWT/OAuth Problem | QAuth Solution |
|-------------------|----------------|
| Algorithm confusion attacks | Server-enforced, no client selection |
| Bearer tokens can be stolen | Proof-of-possession mandatory |
| No built-in revocation | Instant revocation system |
| Payload visible (base64) | Encrypted with XChaCha20-Poly1305 |
| Single signature | Dual: Ed25519 + ML-DSA-65 |
| No post-quantum security | ML-DSA-65 (NIST FIPS 204) |

## Related Packages

- **Rust**: `cargo add qauth`
- **Python**: `pip install qauth`
- **TypeScript/Node.js**: `npm install @quantumshield/qauth`

## License

MIT License

## Author

Tushar Agrawal - [tusharagrawal.in](https://tusharagrawal.in)
