# Contributing to QAuth

Thank you for your interest in contributing to QAuth! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment

## Getting Started

### Prerequisites

- Rust 1.70+ (for core library)
- Python 3.8+ (for Python SDK)
- Node.js 18+ (for TypeScript SDK)
- Go 1.21+ (for Go SDK)

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/Tushar010402/quantum-shield.git
cd quantum-shield/qauth

# Build Rust library
cd rust
cargo build
cargo test

# Set up Python SDK
cd ../sdks/python
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
pytest

# Set up TypeScript SDK
cd ../typescript
npm install
npm test

# Set up Go SDK
cd ../go
go test ./...
```

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - QAuth version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs

### Suggesting Features

1. Check existing feature requests
2. Describe the use case
3. Explain how it improves QAuth
4. Consider backward compatibility

### Submitting Code

#### 1. Fork and Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

#### 2. Write Code

- Follow existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

#### 3. Test Thoroughly

```bash
# Rust
cd rust
cargo test
cargo clippy -- -D warnings
cargo fmt --check

# Python
cd sdks/python
pytest
mypy qauth
black --check qauth tests

# TypeScript
cd sdks/typescript
npm test
npm run lint

# Go
cd sdks/go
go test ./...
go vet ./...
```

#### 4. Submit Pull Request

- Reference related issues
- Describe changes clearly
- Ensure CI passes
- Be responsive to feedback

## Coding Standards

### Rust

- Use `rustfmt` for formatting
- Use `clippy` for linting
- Document public APIs with doc comments
- Use `Result` for error handling, not panics

```rust
/// Creates a new QToken with the specified claims.
///
/// # Arguments
///
/// * `subject` - The token subject (user identifier)
/// * `issuer` - The token issuer URL
///
/// # Returns
///
/// A `Result` containing the encoded token or an error.
///
/// # Example
///
/// ```rust
/// let token = QTokenBuilder::access_token()
///     .subject(b"user-123".to_vec())
///     .issuer("https://auth.example.com")
///     .build(&keys, &encryption_key)?;
/// ```
pub fn build(
    &self,
    signing_keys: &IssuerSigningKeys,
    encryption_key: &EncryptionKey,
) -> Result<Vec<u8>> {
    // ...
}
```

### Python

- Use `black` for formatting
- Use `mypy` for type checking
- Follow PEP 8
- Use type hints

```python
def create_token(
    self,
    subject: str,
    policy_ref: str,
    validity_seconds: int = 3600,
    claims: Optional[Dict[str, Any]] = None,
) -> TokenResponse:
    """
    Create a new QAuth token.

    Args:
        subject: The token subject (user identifier)
        policy_ref: Reference to the authorization policy
        validity_seconds: Token validity period
        claims: Additional custom claims

    Returns:
        TokenResponse containing access and refresh tokens

    Raises:
        QAuthError: If token creation fails
    """
    ...
```

### TypeScript

- Use `prettier` for formatting
- Use `eslint` for linting
- Use strict TypeScript settings
- Export types alongside functions

```typescript
/**
 * Create a new QAuth token.
 *
 * @param options - Token creation options
 * @returns Promise resolving to token response
 * @throws QAuthError if token creation fails
 *
 * @example
 * ```typescript
 * const token = await server.createToken({
 *   subject: 'user-123',
 *   policyRef: 'urn:qauth:policy:default',
 * });
 * ```
 */
export async function createToken(
  options: CreateTokenOptions
): Promise<TokenResponse> {
  // ...
}
```

### Go

- Use `gofmt` for formatting
- Use `go vet` for linting
- Follow Go conventions
- Document exported symbols

```go
// CreateToken creates a new QAuth token with the specified options.
//
// The token is signed with dual signatures (Ed25519 + ML-DSA-65) and
// encrypted with XChaCha20-Poly1305.
//
// Example:
//
//	token, err := server.CreateToken(TokenOptions{
//	    Subject:   []byte("user-123"),
//	    PolicyRef: "urn:qauth:policy:default",
//	})
func (s *Server) CreateToken(opts TokenOptions) (*Token, error) {
    // ...
}
```

## Security Contributions

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, email security concerns to: tusharagrawal0104@gmail.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Review Focus Areas

We especially welcome review of:

1. **Cryptographic implementations**
   - Signature verification
   - Encryption/decryption
   - Key derivation

2. **Token validation**
   - Expiry checking
   - Revocation verification
   - Proof of possession

3. **Policy evaluation**
   - Access control logic
   - Condition evaluation
   - Resource matching

## Documentation

### Types of Documentation

1. **Code comments** - Explain complex logic
2. **API documentation** - Document public interfaces
3. **Guides** - How-to tutorials
4. **Specifications** - Protocol details

### Writing Documentation

- Use clear, concise language
- Include code examples
- Keep examples tested and working
- Update when code changes

## Testing

### Test Requirements

- All new code must have tests
- Maintain >80% code coverage
- Include both unit and integration tests
- Test error cases, not just happy paths

### Test Categories

```rust
#[cfg(test)]
mod tests {
    // Unit tests - test individual functions
    #[test]
    fn test_signature_creation() { ... }

    // Integration tests - test complete flows
    #[test]
    fn test_complete_auth_flow() { ... }

    // Property tests - test invariants
    #[test]
    fn test_roundtrip_serialization() { ... }

    // Negative tests - test error handling
    #[test]
    fn test_invalid_signature_fails() { ... }
}
```

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Run full test suite
4. Create release PR
5. Tag release after merge
6. Publish packages

## Questions?

- Open a discussion on GitHub
- Check existing documentation
- Review closed issues

Thank you for contributing to QAuth!
