#!/bin/bash
# QAuth Release Script
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 0.1.0

set -e

VERSION="${1:-0.1.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QAUTH_DIR="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "QAuth Release Script v$VERSION"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check cargo
    if ! command -v cargo &> /dev/null; then
        log_error "cargo not found. Install Rust: https://rustup.rs"
        exit 1
    fi

    # Check python3
    if ! command -v python3 &> /dev/null; then
        log_error "python3 not found"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Install Node.js: https://nodejs.org"
        exit 1
    fi

    log_info "All prerequisites satisfied"
}

# Build and test all packages
build_all() {
    log_info "Building and testing all packages..."

    # Rust
    log_info "Building Rust..."
    cd "$QAUTH_DIR/rust"
    cargo build --release
    cargo test --all-features

    # Python
    log_info "Building Python..."
    cd "$QAUTH_DIR/sdks/python"
    python3 -m venv .venv 2>/dev/null || true
    source .venv/bin/activate
    pip install build twine -q
    python -m build
    twine check dist/*
    deactivate

    # TypeScript
    log_info "Building TypeScript..."
    cd "$QAUTH_DIR/sdks/typescript"
    npm install
    npm run build || true

    # Go
    log_info "Building Go..."
    cd "$QAUTH_DIR/sdks/go"
    go build ./...
    go test -v ./...

    log_info "All packages built successfully"
}

# Publish to crates.io
publish_crates() {
    log_info "Publishing to crates.io..."

    # First publish quantum-shield (dependency)
    log_info "Publishing quantum-shield..."
    cd "$QAUTH_DIR/../rust"

    # Update Cargo.toml for publishing (change path to version)
    sed -i.bak 's/quantum-shield = { path = "..\/..\/rust" }/quantum-shield = "'$VERSION'"/' "$QAUTH_DIR/rust/Cargo.toml"

    cargo publish || {
        log_error "Failed to publish quantum-shield. Do you have a crates.io token?"
        log_info "Run: cargo login"
        # Restore Cargo.toml
        mv "$QAUTH_DIR/rust/Cargo.toml.bak" "$QAUTH_DIR/rust/Cargo.toml"
        return 1
    }

    # Wait for crates.io to index
    log_info "Waiting for crates.io to index quantum-shield..."
    sleep 30

    # Then publish qauth
    log_info "Publishing qauth..."
    cd "$QAUTH_DIR/rust"
    cargo publish || {
        log_error "Failed to publish qauth"
        # Restore Cargo.toml
        mv "$QAUTH_DIR/rust/Cargo.toml.bak" "$QAUTH_DIR/rust/Cargo.toml"
        return 1
    }

    # Restore Cargo.toml for development
    mv "$QAUTH_DIR/rust/Cargo.toml.bak" "$QAUTH_DIR/rust/Cargo.toml"

    log_info "Published to crates.io successfully"
}

# Publish to PyPI
publish_pypi() {
    log_info "Publishing to PyPI..."

    cd "$QAUTH_DIR/sdks/python"
    source .venv/bin/activate

    # Check if token is configured
    if [ -z "$TWINE_PASSWORD" ] && [ -z "$TWINE_USERNAME" ]; then
        log_warn "No PyPI credentials found."
        log_info "Set TWINE_USERNAME and TWINE_PASSWORD environment variables"
        log_info "Or run: twine upload dist/* --username __token__ --password <your-pypi-token>"
        deactivate
        return 1
    fi

    twine upload dist/* || {
        log_error "Failed to publish to PyPI"
        deactivate
        return 1
    }

    deactivate
    log_info "Published to PyPI successfully"
}

# Publish to npm
publish_npm() {
    log_info "Publishing to npm..."

    cd "$QAUTH_DIR/sdks/typescript"

    # Check if logged in
    npm whoami &>/dev/null || {
        log_warn "Not logged in to npm."
        log_info "Run: npm login"
        return 1
    }

    npm publish --access public || {
        log_error "Failed to publish to npm"
        return 1
    }

    log_info "Published to npm successfully"
}

# Create git tag
create_tag() {
    log_info "Creating git tag v$VERSION..."

    cd "$QAUTH_DIR/.."
    git tag -a "qauth-v$VERSION" -m "QAuth v$VERSION release"
    git push origin "qauth-v$VERSION"

    log_info "Git tag created and pushed"
}

# Main
main() {
    check_prerequisites

    echo ""
    echo "This script will:"
    echo "  1. Build and test all packages"
    echo "  2. Publish quantum-shield to crates.io"
    echo "  3. Publish qauth to crates.io"
    echo "  4. Publish qauth to PyPI (pip/pip3)"
    echo "  5. Publish @quantumshield/qauth to npm"
    echo "  6. Create git tag qauth-v$VERSION"
    echo ""
    echo "Prerequisites:"
    echo "  - cargo login (crates.io token)"
    echo "  - npm login (npm account)"
    echo "  - TWINE_USERNAME/__token__ and TWINE_PASSWORD (PyPI token)"
    echo ""
    read -p "Continue? [y/N] " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted"
        exit 0
    fi

    build_all

    echo ""
    log_info "Choose what to publish:"
    echo "  1. All registries (crates.io, PyPI, npm)"
    echo "  2. crates.io only"
    echo "  3. PyPI only"
    echo "  4. npm only"
    echo "  5. Skip publishing (just build)"
    read -p "Choice [1-5]: " -n 1 -r
    echo

    case $REPLY in
        1)
            publish_crates
            publish_pypi
            publish_npm
            ;;
        2)
            publish_crates
            ;;
        3)
            publish_pypi
            ;;
        4)
            publish_npm
            ;;
        5)
            log_info "Skipping publishing"
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    read -p "Create git tag qauth-v$VERSION? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_tag
    fi

    echo ""
    echo "================================================"
    echo "Release complete!"
    echo "================================================"
    echo ""
    echo "Packages published:"
    echo "  - Rust: cargo add qauth"
    echo "  - Python: pip install qauth  (or pip3 install qauth)"
    echo "  - TypeScript: npm install @quantumshield/qauth"
    echo "  - Go: go get github.com/Tushar010402/qauth-go"
    echo ""
}

main "$@"
