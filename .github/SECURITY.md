# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

### How to Report

Send an email to: **tusharagrawal0104@gmail.com**

Include the following information:

1. **Type of vulnerability** (e.g., signature bypass, encryption weakness, injection)
2. **Location** of the vulnerability (file path, function name)
3. **Steps to reproduce** the issue
4. **Potential impact** of the vulnerability
5. **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We follow **coordinated disclosure**
- We will credit reporters (unless they prefer anonymity)
- We will publish a security advisory after fix is released

## Security Considerations for QAuth

### Cryptographic Components

| Component | Algorithm | Security Level |
|-----------|-----------|----------------|
| Classical Signature | Ed25519 | 128-bit |
| Post-Quantum Signature | ML-DSA-65 | NIST Level 3 |
| Encryption | XChaCha20-Poly1305 | 256-bit |
| Key Derivation | HKDF-SHA256 | 256-bit |

### Known Limitations

1. **Not Yet Audited**: This library has not undergone professional security audit
2. **WASM Limitations**: Browser builds do not include ML-DSA-65 (pqcrypto dependency)
3. **Side-Channel**: Constant-time operations depend on underlying libraries

### Security Best Practices

When using QAuth:

1. **Always verify both signatures** - Never skip the dual signature verification
2. **Always verify proof of possession** - This prevents token theft attacks
3. **Use secure key storage** - Protect signing keys with HSM or secure enclave
4. **Enable revocation checking** - Don't disable the revocation cache
5. **Keep dependencies updated** - Regularly update to get security fixes

### Threat Model

QAuth is designed to protect against:

- Token theft and replay attacks
- Algorithm confusion/downgrade attacks
- Quantum computer attacks (future)
- Payload inspection/modification
- Authorization bypass

QAuth does NOT protect against:

- Compromised signing keys
- Compromised client devices
- Physical access attacks
- Denial of service attacks

## Security Audit History

| Date | Auditor | Scope | Status |
|------|---------|-------|--------|
| - | - | - | Pending |

*We welcome security audits from qualified researchers.*

## Bug Bounty

We do not currently have a formal bug bounty program, but we will:

- Acknowledge security researchers in our CHANGELOG
- Provide a letter of appreciation upon request
- Consider monetary rewards for critical vulnerabilities

## Contact

- Security Email: tusharagrawal0104@gmail.com
- PGP Key: [Available upon request]
