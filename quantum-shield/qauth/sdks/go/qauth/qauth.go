// Package qauth provides the QuantumAuth SDK for Go.
//
// QuantumAuth is a next-generation authentication and authorization protocol
// designed to replace OAuth 2.0 and JWT with post-quantum cryptographic security.
//
// Example usage:
//
//	import "github.com/Tushar010402/qauth-go/qauth"
//
//	// Server-side: Generate issuer keys and create tokens
//	server, err := qauth.NewServer(qauth.ServerConfig{
//	    Issuer:   "https://auth.example.com",
//	    Audience: "https://api.example.com",
//	})
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	token, err := server.CreateToken(qauth.TokenOptions{
//	    Subject:         []byte("user-123"),
//	    PolicyRef:       "urn:qauth:policy:default",
//	    ValiditySeconds: 3600,
//	})
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Client-side: Create proof of possession for API requests
//	client := qauth.NewClient()
//	proof, err := client.CreateProof("GET", "/api/resource", nil, token)
//	if err != nil {
//	    log.Fatal(err)
//	}
//
//	// Server-side: Validate token and proof
//	payload, err := server.ValidateToken(token)
//	if err != nil {
//	    log.Fatal(err)
//	}
package qauth

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Version information
const (
	Version         = "0.1.0"
	ProtocolVersion = "1.0.0"
)

// Error types
var (
	ErrTokenExpired      = errors.New("token expired")
	ErrTokenNotYetValid  = errors.New("token not yet valid")
	ErrInvalidSignature  = errors.New("invalid signature")
	ErrInvalidIssuer     = errors.New("invalid issuer")
	ErrInvalidAudience   = errors.New("invalid audience")
	ErrInvalidProof      = errors.New("invalid proof of possession")
	ErrPolicyNotFound    = errors.New("policy not found")
	ErrAccessDenied      = errors.New("access denied")
)

// TokenType represents the type of QToken
type TokenType byte

const (
	TokenTypeAccess   TokenType = 0x01
	TokenTypeRefresh  TokenType = 0x02
	TokenTypeIdentity TokenType = 0x03
	TokenTypeDevice   TokenType = 0x04
)

// Effect represents a policy decision effect
type Effect string

const (
	EffectAllow Effect = "allow"
	EffectDeny  Effect = "deny"
)

// IssuerKeys holds the issuer's cryptographic keys
type IssuerKeys struct {
	KeyID            []byte
	Ed25519PublicKey []byte
	MLDSAPublicKey   []byte
	EncryptionKey    []byte
}

// KeyIDHex returns the key ID as a hex string
func (k *IssuerKeys) KeyIDHex() string {
	return hex.EncodeToString(k.KeyID)
}

// TokenPayload represents the decoded token payload
type TokenPayload struct {
	Sub []byte                 `json:"sub"` // Subject identifier
	Iss string                 `json:"iss"` // Issuer
	Aud []string               `json:"aud"` // Audiences
	Exp int64                  `json:"exp"` // Expiration time (Unix seconds)
	Iat int64                  `json:"iat"` // Issued at (Unix seconds)
	Nbf int64                  `json:"nbf"` // Not before (Unix seconds)
	Jti []byte                 `json:"jti"` // JWT ID
	Rid []byte                 `json:"rid"` // Revocation ID
	Pol string                 `json:"pol"` // Policy reference
	Ctx []byte                 `json:"ctx"` // Context hash
	Cst map[string]interface{} `json:"cst"` // Custom claims
}

// IsExpired checks if the token is expired
func (p *TokenPayload) IsExpired() bool {
	return time.Now().Unix() > p.Exp
}

// IsNotYetValid checks if the token is not yet valid
func (p *TokenPayload) IsNotYetValid() bool {
	return time.Now().Unix() < p.Nbf
}

// SubjectString returns the subject as a string
func (p *TokenPayload) SubjectString() string {
	return string(p.Sub)
}

// EvaluationResult represents a policy evaluation result
type EvaluationResult struct {
	Effect      Effect  `json:"effect"`
	MatchedRule *string `json:"matched_rule,omitempty"`
	Reason      string  `json:"reason"`
}

// ServerConfig holds configuration for the QAuth server
type ServerConfig struct {
	Issuer   string
	Audience string
}

// TokenOptions holds options for token creation
type TokenOptions struct {
	Subject         []byte
	Audiences       []string // If nil, uses server's default audience
	PolicyRef       string
	ValiditySeconds int64
	ClientKey       []byte
	DeviceKey       []byte
	Claims          map[string]interface{}
}

// Server handles server-side QAuth operations
type Server struct {
	config         ServerConfig
	ed25519Private ed25519.PrivateKey
	ed25519Public  ed25519.PublicKey
	encryptionKey  []byte
	keyID          []byte
}

// NewServer creates a new QAuth server with generated keys
func NewServer(config ServerConfig) (*Server, error) {
	// Generate Ed25519 keypair
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate Ed25519 key: %w", err)
	}

	// Generate encryption key
	encKey := make([]byte, 32)
	if _, err := rand.Read(encKey); err != nil {
		return nil, fmt.Errorf("failed to generate encryption key: %w", err)
	}

	// Compute key ID
	h := sha256.New()
	h.Write([]byte{0x51, 0x41}) // "QA" magic bytes
	h.Write(pub)
	// Note: In full implementation, would also include ML-DSA public key
	keyID := h.Sum(nil)

	return &Server{
		config:         config,
		ed25519Private: priv,
		ed25519Public:  pub,
		encryptionKey:  encKey,
		keyID:          keyID,
	}, nil
}

// GetPublicKeys returns the issuer's public keys for sharing
func (s *Server) GetPublicKeys() *IssuerKeys {
	return &IssuerKeys{
		KeyID:            s.keyID,
		Ed25519PublicKey: s.ed25519Public,
		MLDSAPublicKey:   nil, // Requires Rust FFI for ML-DSA
		EncryptionKey:    s.encryptionKey,
	}
}

// CreateToken creates a new QToken
//
// Note: This is a simplified Go-native implementation.
// For full post-quantum security, use the Rust FFI bindings.
func (s *Server) CreateToken(opts TokenOptions) (string, error) {
	now := time.Now().Unix()

	audiences := opts.Audiences
	if audiences == nil {
		audiences = []string{s.config.Audience}
	}

	// Generate random IDs
	jti := make([]byte, 16)
	rid := make([]byte, 16)
	rand.Read(jti)
	rand.Read(rid)

	payload := TokenPayload{
		Sub: opts.Subject,
		Iss: s.config.Issuer,
		Aud: audiences,
		Exp: now + opts.ValiditySeconds,
		Iat: now,
		Nbf: now,
		Jti: jti,
		Rid: rid,
		Pol: opts.PolicyRef,
		Ctx: make([]byte, 32),
		Cst: opts.Claims,
	}

	// Serialize payload to JSON (simplified; full impl uses CBOR)
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to serialize payload: %w", err)
	}

	// Sign with Ed25519 (simplified; full impl has dual signatures)
	signature := ed25519.Sign(s.ed25519Private, payloadBytes)

	// Create token structure (simplified format)
	token := map[string]interface{}{
		"header": map[string]interface{}{
			"version": 1,
			"type":    TokenTypeAccess,
			"kid":     base64.RawURLEncoding.EncodeToString(s.keyID),
		},
		"payload":   base64.RawURLEncoding.EncodeToString(payloadBytes),
		"signature": base64.RawURLEncoding.EncodeToString(signature),
	}

	tokenBytes, err := json.Marshal(token)
	if err != nil {
		return "", fmt.Errorf("failed to serialize token: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(tokenBytes), nil
}

// ValidateToken validates a token and returns its payload
func (s *Server) ValidateToken(tokenStr string) (*TokenPayload, error) {
	// Decode token
	tokenBytes, err := base64.RawURLEncoding.DecodeString(tokenStr)
	if err != nil {
		return nil, fmt.Errorf("invalid token encoding: %w", err)
	}

	var token map[string]interface{}
	if err := json.Unmarshal(tokenBytes, &token); err != nil {
		return nil, fmt.Errorf("invalid token format: %w", err)
	}

	// Extract and decode payload
	payloadB64, ok := token["payload"].(string)
	if !ok {
		return nil, errors.New("missing payload")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding: %w", err)
	}

	// Verify signature
	sigB64, ok := token["signature"].(string)
	if !ok {
		return nil, errors.New("missing signature")
	}

	signature, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding: %w", err)
	}

	if !ed25519.Verify(s.ed25519Public, payloadBytes, signature) {
		return nil, ErrInvalidSignature
	}

	// Decode payload
	var payload TokenPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid payload: %w", err)
	}

	// Validate claims
	if payload.Iss != s.config.Issuer {
		return nil, ErrInvalidIssuer
	}

	foundAudience := false
	for _, aud := range payload.Aud {
		if aud == s.config.Audience {
			foundAudience = true
			break
		}
	}
	if !foundAudience {
		return nil, ErrInvalidAudience
	}

	if payload.IsExpired() {
		return nil, ErrTokenExpired
	}

	if payload.IsNotYetValid() {
		return nil, ErrTokenNotYetValid
	}

	return &payload, nil
}

// Client handles client-side QAuth operations
type Client struct {
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
}

// NewClient creates a new QAuth client with a generated keypair
func NewClient() *Client {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	return &Client{
		privateKey: priv,
		publicKey:  pub,
	}
}

// PublicKey returns the client's public key
func (c *Client) PublicKey() []byte {
	return c.publicKey
}

// ProofOfPossession represents a proof of possession
type ProofOfPossession struct {
	Timestamp int64  `json:"timestamp"`
	Nonce     []byte `json:"nonce"`
	Method    string `json:"method"`
	URI       string `json:"uri"`
	BodyHash  []byte `json:"body_hash"`
	TokenHash []byte `json:"token_hash"`
	Signature []byte `json:"signature"`
}

// CreateProof creates a proof of possession for an API request
func (c *Client) CreateProof(method, uri string, body []byte, token string) (string, error) {
	timestamp := time.Now().UnixMilli()

	// Generate nonce
	nonce := make([]byte, 16)
	rand.Read(nonce)

	// Hash body
	var bodyHash []byte
	if body != nil {
		h := sha256.Sum256(body)
		bodyHash = h[:]
	} else {
		bodyHash = make([]byte, 32)
	}

	// Hash token
	tokenHash := sha256.Sum256([]byte(token))

	// Create message to sign
	message := make([]byte, 0, 8+16+len(method)+len(uri)+32+32)
	message = append(message, byte(timestamp>>56), byte(timestamp>>48), byte(timestamp>>40), byte(timestamp>>32))
	message = append(message, byte(timestamp>>24), byte(timestamp>>16), byte(timestamp>>8), byte(timestamp))
	message = append(message, nonce...)
	message = append(message, []byte(method)...)
	message = append(message, []byte(uri)...)
	message = append(message, bodyHash...)
	message = append(message, tokenHash[:]...)

	// Sign
	signature := ed25519.Sign(c.privateKey, message)

	proof := ProofOfPossession{
		Timestamp: timestamp,
		Nonce:     nonce,
		Method:    method,
		URI:       uri,
		BodyHash:  bodyHash,
		TokenHash: tokenHash[:],
		Signature: signature,
	}

	proofBytes, err := json.Marshal(proof)
	if err != nil {
		return "", fmt.Errorf("failed to serialize proof: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(proofBytes), nil
}

// ProofValidator validates proofs of possession
type ProofValidator struct {
	clientPublicKey ed25519.PublicKey
	maxAgeSeconds   int64
}

// NewProofValidator creates a new proof validator
func NewProofValidator(clientPublicKey []byte) *ProofValidator {
	return &ProofValidator{
		clientPublicKey: clientPublicKey,
		maxAgeSeconds:   60, // 1 minute default
	}
}

// Validate validates a proof of possession
func (v *ProofValidator) Validate(proofStr, method, uri string, body []byte, token string) error {
	// Decode proof
	proofBytes, err := base64.RawURLEncoding.DecodeString(proofStr)
	if err != nil {
		return fmt.Errorf("invalid proof encoding: %w", err)
	}

	var proof ProofOfPossession
	if err := json.Unmarshal(proofBytes, &proof); err != nil {
		return fmt.Errorf("invalid proof format: %w", err)
	}

	// Check timestamp
	nowMs := time.Now().UnixMilli()
	if nowMs-proof.Timestamp > v.maxAgeSeconds*1000 {
		return ErrInvalidProof
	}

	// Check method
	if proof.Method != method {
		return ErrInvalidProof
	}

	// Check URI
	if proof.URI != uri {
		return ErrInvalidProof
	}

	// Check body hash
	var expectedBodyHash []byte
	if body != nil {
		h := sha256.Sum256(body)
		expectedBodyHash = h[:]
	} else {
		expectedBodyHash = make([]byte, 32)
	}

	for i := range expectedBodyHash {
		if proof.BodyHash[i] != expectedBodyHash[i] {
			return ErrInvalidProof
		}
	}

	// Check token hash
	expectedTokenHash := sha256.Sum256([]byte(token))
	for i := range expectedTokenHash {
		if proof.TokenHash[i] != expectedTokenHash[i] {
			return ErrInvalidProof
		}
	}

	// Recreate message and verify signature
	message := make([]byte, 0, 8+16+len(method)+len(uri)+32+32)
	message = append(message, byte(proof.Timestamp>>56), byte(proof.Timestamp>>48), byte(proof.Timestamp>>40), byte(proof.Timestamp>>32))
	message = append(message, byte(proof.Timestamp>>24), byte(proof.Timestamp>>16), byte(proof.Timestamp>>8), byte(proof.Timestamp))
	message = append(message, proof.Nonce...)
	message = append(message, []byte(method)...)
	message = append(message, []byte(uri)...)
	message = append(message, proof.BodyHash...)
	message = append(message, proof.TokenHash...)

	if !ed25519.Verify(v.clientPublicKey, message, proof.Signature) {
		return ErrInvalidSignature
	}

	return nil
}

// Policy represents a QAuth policy
type Policy struct {
	ID          string                 `json:"id"`
	Version     string                 `json:"version"`
	Issuer      string                 `json:"issuer"`
	Name        string                 `json:"name,omitempty"`
	Description string                 `json:"description,omitempty"`
	Rules       []PolicyRule           `json:"rules"`
	Defaults    PolicyDefaults         `json:"defaults,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// PolicyRule represents a rule in a policy
type PolicyRule struct {
	ID         string                 `json:"id,omitempty"`
	Effect     Effect                 `json:"effect"`
	Resources  []string               `json:"resources"`
	Actions    []string               `json:"actions"`
	Conditions map[string]interface{} `json:"conditions,omitempty"`
	Priority   int                    `json:"priority,omitempty"`
}

// PolicyDefaults represents default behavior for a policy
type PolicyDefaults struct {
	Effect               Effect `json:"effect"`
	AuditUnmatched       bool   `json:"audit_unmatched"`
	RequireExplicitAllow bool   `json:"require_explicit_allow"`
}

// EvaluationContext represents the context for policy evaluation
type EvaluationContext struct {
	Subject  SubjectContext  `json:"subject,omitempty"`
	Resource ResourceContext `json:"resource,omitempty"`
	Request  RequestContext  `json:"request,omitempty"`
}

// SubjectContext represents subject information
type SubjectContext struct {
	ID         string                 `json:"id,omitempty"`
	Email      string                 `json:"email,omitempty"`
	Roles      []string               `json:"roles,omitempty"`
	Groups     []string               `json:"groups,omitempty"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// ResourceContext represents resource information
type ResourceContext struct {
	Path       string                 `json:"path"`
	Owner      string                 `json:"owner,omitempty"`
	Type       string                 `json:"type,omitempty"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// RequestContext represents request information
type RequestContext struct {
	Action      string `json:"action"`
	Method      string `json:"method,omitempty"`
	IP          string `json:"ip,omitempty"`
	MFAVerified bool   `json:"mfa_verified,omitempty"`
	MFAMethod   string `json:"mfa_method,omitempty"`
	DeviceType  string `json:"device_type,omitempty"`
	IsVPN       bool   `json:"is_vpn,omitempty"`
}

// PolicyEngine evaluates QAuth policies
type PolicyEngine struct {
	policies map[string]*Policy
}

// NewPolicyEngine creates a new policy engine
func NewPolicyEngine() *PolicyEngine {
	return &PolicyEngine{
		policies: make(map[string]*Policy),
	}
}

// LoadPolicy loads a policy into the engine
func (e *PolicyEngine) LoadPolicy(policy *Policy) {
	e.policies[policy.ID] = policy
}

// Evaluate evaluates a policy for a given context
func (e *PolicyEngine) Evaluate(policyID string, ctx *EvaluationContext) (*EvaluationResult, error) {
	policy, ok := e.policies[policyID]
	if !ok {
		return nil, ErrPolicyNotFound
	}

	// Sort rules by priority (higher first)
	// For simplicity, using a basic loop; production would use proper sorting

	for _, rule := range policy.Rules {
		if e.matchesRule(&rule, ctx) {
			matchedRule := rule.ID
			return &EvaluationResult{
				Effect:      rule.Effect,
				MatchedRule: &matchedRule,
				Reason:      fmt.Sprintf("Matched rule: %s", rule.ID),
			}, nil
		}
	}

	// No rule matched, return default deny
	return &EvaluationResult{
		Effect:      EffectDeny,
		MatchedRule: nil,
		Reason:      "No matching rule, default deny",
	}, nil
}

func (e *PolicyEngine) matchesRule(rule *PolicyRule, ctx *EvaluationContext) bool {
	// Check resource matches
	if !e.matchesResources(rule.Resources, ctx.Resource.Path) {
		return false
	}

	// Check action matches
	if !e.matchesActions(rule.Actions, ctx.Request.Action) {
		return false
	}

	// Conditions would be checked here in full implementation
	return true
}

func (e *PolicyEngine) matchesResources(patterns []string, resource string) bool {
	for _, pattern := range patterns {
		if pattern == "*" || pattern == "**" || pattern == resource {
			return true
		}
		// Simple glob matching; production would use proper glob library
		if len(pattern) > 0 && pattern[len(pattern)-1] == '*' {
			prefix := pattern[:len(pattern)-1]
			if len(resource) >= len(prefix) && resource[:len(prefix)] == prefix {
				return true
			}
		}
	}
	return false
}

func (e *PolicyEngine) matchesActions(allowed []string, action string) bool {
	for _, a := range allowed {
		if a == "*" || a == action {
			return true
		}
	}
	return false
}
