package qauth

import (
	"testing"
	"time"
)

func TestNewServer(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})

	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	if server == nil {
		t.Fatal("Server is nil")
	}
}

func TestServerCreateToken(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
		Claims: map[string]interface{}{
			"email": "user@example.com",
			"roles": []string{"user", "premium"},
		},
	})

	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	if token == "" {
		t.Fatal("Token is empty")
	}
}

func TestServerValidateToken(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if string(payload.Sub) != "user-123" {
		t.Errorf("Expected subject 'user-123', got '%s'", string(payload.Sub))
	}

	if payload.Iss != "https://auth.example.com" {
		t.Errorf("Expected issuer 'https://auth.example.com', got '%s'", payload.Iss)
	}

	if payload.Pol != "urn:qauth:policy:default" {
		t.Errorf("Expected policy 'urn:qauth:policy:default', got '%s'", payload.Pol)
	}
}

func TestServerTokenWithCustomClaims(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte("user-123"),
		PolicyRef: "urn:qauth:policy:default",
		Claims: map[string]interface{}{
			"department": "engineering",
			"level":      5,
		},
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if payload.Cst["department"] != "engineering" {
		t.Errorf("Expected department 'engineering', got '%v'", payload.Cst["department"])
	}

	// Note: JSON unmarshaling may convert integers to float64
	level, ok := payload.Cst["level"].(float64)
	if !ok || level != 5 {
		t.Errorf("Expected level 5, got '%v'", payload.Cst["level"])
	}
}

func TestServerTokenExpiration(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	validity := int64(7200) // 2 hours
	token, err := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: validity,
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	expectedExp := payload.Iat + validity
	if payload.Exp != expectedExp {
		t.Errorf("Expected exp %d, got %d", expectedExp, payload.Exp)
	}
}

func TestServerGetPublicKeys(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	keys := server.GetPublicKeys()

	if len(keys.Ed25519PublicKey) != 32 {
		t.Errorf("Expected Ed25519 key length 32, got %d", len(keys.Ed25519PublicKey))
	}

	// ML-DSA key is nil in the Go implementation (requires Rust FFI)
	// Just verify the keys struct exists
	if keys.KeyID == nil || len(keys.KeyID) != 32 {
		t.Errorf("Expected KeyID length 32, got %d", len(keys.KeyID))
	}
}

func TestNewClient(t *testing.T) {
	client := NewClient()

	if client == nil {
		t.Fatal("Client is nil")
	}
}

func TestClientPublicKey(t *testing.T) {
	client := NewClient()
	publicKey := client.PublicKey()

	if len(publicKey) != 32 {
		t.Errorf("Expected public key length 32, got %d", len(publicKey))
	}
}

func TestClientUniqueKeys(t *testing.T) {
	client1 := NewClient()
	client2 := NewClient()

	key1 := client1.PublicKey()
	key2 := client2.PublicKey()

	// Keys should be different
	equal := true
	for i := range key1 {
		if key1[i] != key2[i] {
			equal = false
			break
		}
	}

	if equal {
		t.Error("Expected different keys for different clients")
	}
}

func TestClientCreateProof(t *testing.T) {
	client := NewClient()
	proof, err := client.CreateProof("GET", "/api/resource", nil, "test-token")

	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	if proof == "" {
		t.Fatal("Proof is empty")
	}
}

func TestClientCreateProofWithBody(t *testing.T) {
	client := NewClient()
	body := []byte("request body content")
	proof, err := client.CreateProof("POST", "/api/resource", body, "test-token")

	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	if proof == "" {
		t.Fatal("Proof is empty")
	}
}

func TestNewPolicyEngine(t *testing.T) {
	engine := NewPolicyEngine()

	if engine == nil {
		t.Fatal("Policy engine is nil")
	}
}

func TestPolicyEngineLoadPolicy(t *testing.T) {
	engine := NewPolicyEngine()

	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:test",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "read-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read", "list"},
			},
		},
	})

	// Policy loaded successfully - no error means success
}

func TestPolicyEngineAllowMatchingRequest(t *testing.T) {
	engine := NewPolicyEngine()

	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:test",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "read-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read", "list"},
			},
		},
	})

	result, err := engine.Evaluate("urn:qauth:policy:test", &EvaluationContext{
		Subject: SubjectContext{
			ID: "user-123",
		},
		Resource: ResourceContext{
			Path: "projects/456",
		},
		Request: RequestContext{
			Action: "read",
		},
	})
	if err != nil {
		t.Fatalf("Failed to evaluate: %v", err)
	}

	if result.Effect != EffectAllow {
		t.Errorf("Expected allow, got %s", result.Effect)
	}

	if result.MatchedRule == nil || *result.MatchedRule != "read-projects" {
		var matched string
		if result.MatchedRule != nil {
			matched = *result.MatchedRule
		}
		t.Errorf("Expected matched rule 'read-projects', got '%s'", matched)
	}
}

func TestPolicyEngineDenyNonMatchingRequest(t *testing.T) {
	engine := NewPolicyEngine()

	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:test",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "read-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read"},
			},
		},
	})

	result, err := engine.Evaluate("urn:qauth:policy:test", &EvaluationContext{
		Subject: SubjectContext{
			ID: "user-123",
		},
		Resource: ResourceContext{
			Path: "projects/456",
		},
		Request: RequestContext{
			Action: "delete",
		},
	})
	if err != nil {
		t.Fatalf("Failed to evaluate: %v", err)
	}

	if result.Effect != EffectDeny {
		t.Errorf("Expected deny, got %s", result.Effect)
	}
}

func TestPolicyEngineDenyUnknownPolicy(t *testing.T) {
	engine := NewPolicyEngine()

	_, err := engine.Evaluate("urn:qauth:policy:unknown", &EvaluationContext{
		Subject: SubjectContext{
			ID: "user-123",
		},
		Resource: ResourceContext{
			Path: "projects/456",
		},
		Request: RequestContext{
			Action: "read",
		},
	})

	if err == nil {
		t.Error("Expected error for unknown policy")
	}
}

func TestPolicyEngineWildcardActions(t *testing.T) {
	engine := NewPolicyEngine()

	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:admin",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "admin-all",
				Effect:    EffectAllow,
				Resources: []string{"admin/*"},
				Actions:   []string{"*"},
			},
		},
	})

	result, err := engine.Evaluate("urn:qauth:policy:admin", &EvaluationContext{
		Subject: SubjectContext{
			ID: "admin-1",
		},
		Resource: ResourceContext{
			Path: "admin/users/123",
		},
		Request: RequestContext{
			Action: "delete",
		},
	})
	if err != nil {
		t.Fatalf("Failed to evaluate: %v", err)
	}

	if result.Effect != EffectAllow {
		t.Errorf("Expected allow, got %s", result.Effect)
	}
}

func TestIntegrationCompleteAuthFlow(t *testing.T) {
	// 1. Create server
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// 2. Create client
	client := NewClient()
	publicKey := client.PublicKey()
	if len(publicKey) != 32 {
		t.Errorf("Expected public key length 32, got %d", len(publicKey))
	}

	// 3. Create token
	token, err := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
		ClientKey:       publicKey,
		Claims: map[string]interface{}{
			"email": "user@example.com",
			"roles": []string{"user"},
		},
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// 4. Create proof
	proof, err := client.CreateProof("GET", "/api/users/me", nil, token)
	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	// 5. Validate token
	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if string(payload.Sub) != "user-123" {
		t.Errorf("Expected subject 'user-123', got '%s'", string(payload.Sub))
	}

	// 6. Verify proof exists
	if proof == "" {
		t.Error("Proof should not be empty")
	}
}

func TestIntegrationCompleteAuthorizationFlow(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	engine := NewPolicyEngine()

	// Load policy
	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:api-access",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "read-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read", "list"},
			},
			{
				ID:        "write-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*/files"},
				Actions:   []string{"write", "create"},
			},
		},
	})

	// Create token
	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte("user-123"),
		PolicyRef: "urn:qauth:policy:api-access",
		Claims: map[string]interface{}{
			"department": "engineering",
		},
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Validate token
	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// Evaluate authorization
	result, err := engine.Evaluate("urn:qauth:policy:api-access", &EvaluationContext{
		Subject: SubjectContext{
			ID:         string(payload.Sub),
			Attributes: payload.Cst,
		},
		Resource: ResourceContext{
			Path: "projects/456",
		},
		Request: RequestContext{
			Action: "read",
		},
	})
	if err != nil {
		t.Fatalf("Failed to evaluate: %v", err)
	}

	if result.Effect != EffectAllow {
		t.Errorf("Expected allow, got %s", result.Effect)
	}
}

func TestEdgeCaseEmptyClaims(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte("user-123"),
		PolicyRef: "urn:qauth:policy:default",
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if payload.Cst != nil && len(payload.Cst) != 0 {
		t.Errorf("Expected empty or nil claims, got %v", payload.Cst)
	}
}

func TestEdgeCaseSpecialCharactersInSubject(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	subject := "user+special@example.com"
	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte(subject),
		PolicyRef: "urn:qauth:policy:default",
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if string(payload.Sub) != subject {
		t.Errorf("Expected subject '%s', got '%s'", subject, string(payload.Sub))
	}
}

func TestEdgeCaseComplexNestedClaims(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	claims := map[string]interface{}{
		"metadata": map[string]interface{}{
			"created": "2026-01-30",
			"tags":    []string{"a", "b", "c"},
			"nested": map[string]interface{}{
				"deep": map[string]interface{}{
					"value": 42,
				},
			},
		},
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte("user-123"),
		PolicyRef: "urn:qauth:policy:default",
		Claims:    claims,
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	metadata, ok := payload.Cst["metadata"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected metadata to be a map")
	}

	if metadata["created"] != "2026-01-30" {
		t.Errorf("Expected created '2026-01-30', got '%v'", metadata["created"])
	}
}

func TestEdgeCaseLargeClaims(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	permissions := make([]string, 100)
	for i := range permissions {
		permissions[i] = "permission-" + string(rune('0'+i%10))
	}

	groups := make([]string, 50)
	for i := range groups {
		groups[i] = "group-" + string(rune('0'+i%10))
	}

	claims := map[string]interface{}{
		"permissions": permissions,
		"groups":      groups,
	}

	token, err := server.CreateToken(TokenOptions{
		Subject:   []byte("user-123"),
		PolicyRef: "urn:qauth:policy:default",
		Claims:    claims,
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	perms, ok := payload.Cst["permissions"].([]interface{})
	if !ok || len(perms) != 100 {
		t.Errorf("Expected 100 permissions, got %v", len(perms))
	}

	grps, ok := payload.Cst["groups"].([]interface{})
	if !ok || len(grps) != 50 {
		t.Errorf("Expected 50 groups, got %v", len(grps))
	}
}

// Test proof validation
func TestProofValidation(t *testing.T) {
	client := NewClient()
	token := "test-token-string"

	// Create proof
	proof, err := client.CreateProof("GET", "/api/resource", nil, token)
	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	// Validate proof
	validator := NewProofValidator(client.PublicKey())
	err = validator.Validate(proof, "GET", "/api/resource", nil, token)
	if err != nil {
		t.Errorf("Proof validation failed: %v", err)
	}
}

func TestProofValidationWithBody(t *testing.T) {
	client := NewClient()
	token := "test-token-string"
	body := []byte("request body content")

	// Create proof
	proof, err := client.CreateProof("POST", "/api/resource", body, token)
	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	// Validate proof
	validator := NewProofValidator(client.PublicKey())
	err = validator.Validate(proof, "POST", "/api/resource", body, token)
	if err != nil {
		t.Errorf("Proof validation failed: %v", err)
	}
}

func TestProofValidationInvalidMethod(t *testing.T) {
	client := NewClient()
	token := "test-token-string"

	// Create proof with GET
	proof, err := client.CreateProof("GET", "/api/resource", nil, token)
	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	// Validate with POST should fail
	validator := NewProofValidator(client.PublicKey())
	err = validator.Validate(proof, "POST", "/api/resource", nil, token)
	if err == nil {
		t.Error("Expected validation to fail for wrong method")
	}
}

func TestProofValidationInvalidURI(t *testing.T) {
	client := NewClient()
	token := "test-token-string"

	// Create proof for /api/resource
	proof, err := client.CreateProof("GET", "/api/resource", nil, token)
	if err != nil {
		t.Fatalf("Failed to create proof: %v", err)
	}

	// Validate for /api/other should fail
	validator := NewProofValidator(client.PublicKey())
	err = validator.Validate(proof, "GET", "/api/other", nil, token)
	if err == nil {
		t.Error("Expected validation to fail for wrong URI")
	}
}

// Benchmark tests
func BenchmarkServerCreateToken(b *testing.B) {
	server, _ := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = server.CreateToken(TokenOptions{
			Subject:         []byte("user-123"),
			PolicyRef:       "urn:qauth:policy:default",
			ValiditySeconds: 3600,
		})
	}
}

func BenchmarkServerValidateToken(b *testing.B) {
	server, _ := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})

	token, _ := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = server.ValidateToken(token)
	}
}

func BenchmarkClientCreateProof(b *testing.B) {
	client := NewClient()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = client.CreateProof("GET", "/api/resource", nil, "test-token")
	}
}

func BenchmarkPolicyEngineEvaluate(b *testing.B) {
	engine := NewPolicyEngine()
	engine.LoadPolicy(&Policy{
		ID:      "urn:qauth:policy:test",
		Version: "2026-01-30",
		Issuer:  "https://auth.example.com",
		Rules: []PolicyRule{
			{
				ID:        "read-projects",
				Effect:    EffectAllow,
				Resources: []string{"projects/*"},
				Actions:   []string{"read", "list"},
			},
		},
	})

	context := &EvaluationContext{
		Subject: SubjectContext{
			ID: "user-123",
		},
		Resource: ResourceContext{
			Path: "projects/456",
		},
		Request: RequestContext{
			Action: "read",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = engine.Evaluate("urn:qauth:policy:test", context)
	}
}

// Test helper to ensure time is progressing for token validation
func TestTokenTimestamps(t *testing.T) {
	server, err := NewServer(ServerConfig{
		Issuer:   "https://auth.example.com",
		Audience: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	beforeCreate := time.Now().Unix()

	token, err := server.CreateToken(TokenOptions{
		Subject:         []byte("user-123"),
		PolicyRef:       "urn:qauth:policy:default",
		ValiditySeconds: 3600,
	})
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	afterCreate := time.Now().Unix()

	payload, err := server.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// iat should be between beforeCreate and afterCreate
	if payload.Iat < beforeCreate || payload.Iat > afterCreate {
		t.Errorf("iat %d is not between %d and %d", payload.Iat, beforeCreate, afterCreate)
	}

	// nbf should be same as iat
	if payload.Nbf != payload.Iat {
		t.Errorf("nbf %d should equal iat %d", payload.Nbf, payload.Iat)
	}

	// exp should be iat + validity
	expectedExp := payload.Iat + 3600
	if payload.Exp != expectedExp {
		t.Errorf("exp %d should be %d", payload.Exp, expectedExp)
	}
}
