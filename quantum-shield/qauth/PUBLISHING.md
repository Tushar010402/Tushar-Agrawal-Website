# Publishing QAuth to Package Registries

This guide covers publishing QAuth to all major package registries.

## Quick Start

Run the release script:

```bash
cd quantum-shield/qauth
./scripts/release.sh 0.1.0
```

## Manual Publishing

### 1. crates.io (Rust)

```bash
# Login to crates.io (get token from https://crates.io/settings/tokens)
cargo login

# First, publish quantum-shield (dependency)
cd quantum-shield/rust
cargo publish

# Wait ~30 seconds for indexing, then publish qauth
cd ../qauth/rust
# Edit Cargo.toml: change path dependency to version
# quantum-shield = "0.1"
cargo publish
```

### 2. PyPI (Python - pip/pip3)

```bash
# Create virtual environment
cd quantum-shield/qauth/sdks/python
python3 -m venv .venv
source .venv/bin/activate

# Install build tools
pip install build twine

# Build package
python -m build

# Check package
twine check dist/*

# Upload to PyPI (get token from https://pypi.org/manage/account/token/)
twine upload dist/* --username __token__ --password pypi-YOUR-TOKEN

# Or set environment variables
export TWINE_USERNAME=__token__
export TWINE_PASSWORD=pypi-YOUR-TOKEN
twine upload dist/*
```

After publishing, install with:
```bash
pip install qauth
pip3 install qauth
```

### 3. npm (TypeScript/JavaScript)

```bash
cd quantum-shield/qauth/sdks/typescript

# Login to npm
npm login

# Build
npm install
npm run build

# Publish
npm publish --access public
```

After publishing, install with:
```bash
npm install @quantumshield/qauth
yarn add @quantumshield/qauth
pnpm add @quantumshield/qauth
bun add @quantumshield/qauth
```

### 4. Go Module

Go modules are published automatically when you create a git tag:

```bash
# Tag the release
git tag -a qauth-go/v0.1.0 -m "QAuth Go SDK v0.1.0"
git push origin qauth-go/v0.1.0
```

After tagging, install with:
```bash
go get github.com/Tushar010402/qauth-go@v0.1.0
```

## GitHub Actions (Automated)

The CI/CD pipeline can publish automatically on release:

1. Create secrets in GitHub repository settings:
   - `CRATES_IO_TOKEN` - crates.io API token
   - `PYPI_TOKEN` - PyPI API token
   - `NPM_TOKEN` - npm access token

2. Create a GitHub release with tag `qauth-v0.1.0`

3. The workflow will automatically publish to all registries

## Version Checklist

Before publishing, ensure:

- [ ] Update version in `quantum-shield/qauth/rust/Cargo.toml`
- [ ] Update version in `quantum-shield/qauth/sdks/python/pyproject.toml`
- [ ] Update version in `quantum-shield/qauth/sdks/typescript/package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run all tests: `make test`
- [ ] Run security audit: `make security`

## Package URLs

After publishing:

- **crates.io**: https://crates.io/crates/qauth
- **PyPI**: https://pypi.org/project/qauth/
- **npm**: https://www.npmjs.com/package/@quantumshield/qauth
- **Go**: https://pkg.go.dev/github.com/Tushar010402/qauth-go

## Troubleshooting

### crates.io: "no token found"
```bash
cargo login
# Enter your token from https://crates.io/settings/tokens
```

### PyPI: "403 Forbidden"
- Ensure package name isn't taken
- Use `__token__` as username with API token as password
- Check token permissions (needs "Upload packages")

### npm: "403 Forbidden"
- Package name might be taken or too similar to existing package
- Ensure you're logged in: `npm whoami`
- Check if scope is available: `npm search @quantumshield`

### Go: "module not found"
- Ensure git tag follows format: `qauth-go/v0.1.0`
- Wait for pkg.go.dev to index (may take a few minutes)
- Force index: `GOPROXY=direct go get github.com/Tushar010402/qauth-go@v0.1.0`
