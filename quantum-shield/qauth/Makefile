# QAuth Development Makefile
# Usage: make <target>

.PHONY: all build test lint fmt clean docs publish help

# Default target
all: fmt lint test build

# ============================================
# Build
# ============================================

build: build-rust build-python build-typescript build-go
	@echo "All builds complete"

build-rust:
	@echo "Building Rust library..."
	cd rust && cargo build --release

build-python:
	@echo "Building Python SDK..."
	cd sdks/python && pip install -e ".[dev]"

build-typescript:
	@echo "Building TypeScript SDK..."
	cd sdks/typescript && npm install && npm run build || true

build-go:
	@echo "Building Go SDK..."
	cd sdks/go && go build ./...

# ============================================
# Test
# ============================================

test: test-rust test-python test-typescript test-go
	@echo "All tests complete"

test-rust:
	@echo "Testing Rust library..."
	cd rust && cargo test --all-features

test-python:
	@echo "Testing Python SDK..."
	cd sdks/python && pytest

test-typescript:
	@echo "Testing TypeScript SDK..."
	cd sdks/typescript && npm test || true

test-go:
	@echo "Testing Go SDK..."
	cd sdks/go && go test -v -race ./...

test-coverage:
	@echo "Running tests with coverage..."
	cd rust && cargo tarpaulin --out html
	cd sdks/python && pytest --cov=qauth --cov-report=html
	cd sdks/go && go test -coverprofile=coverage.out ./...

# ============================================
# Lint
# ============================================

lint: lint-rust lint-python lint-typescript lint-go
	@echo "All lints complete"

lint-rust:
	@echo "Linting Rust..."
	cd rust && cargo clippy --all-targets --all-features -- -D warnings

lint-python:
	@echo "Linting Python..."
	cd sdks/python && ruff check qauth tests && mypy qauth

lint-typescript:
	@echo "Linting TypeScript..."
	cd sdks/typescript && npm run lint || true

lint-go:
	@echo "Linting Go..."
	cd sdks/go && go vet ./... && golangci-lint run || true

# ============================================
# Format
# ============================================

fmt: fmt-rust fmt-python fmt-typescript fmt-go
	@echo "All formatting complete"

fmt-rust:
	@echo "Formatting Rust..."
	cd rust && cargo fmt

fmt-python:
	@echo "Formatting Python..."
	cd sdks/python && black qauth tests

fmt-typescript:
	@echo "Formatting TypeScript..."
	cd sdks/typescript && npm run format || true

fmt-go:
	@echo "Formatting Go..."
	cd sdks/go && gofmt -s -w .

fmt-check:
	@echo "Checking formatting..."
	cd rust && cargo fmt --check
	cd sdks/python && black --check qauth tests
	cd sdks/typescript && npm run format:check || true
	cd sdks/go && test -z "$$(gofmt -s -l .)"

# ============================================
# Security
# ============================================

security: security-audit fuzz
	@echo "Security checks complete"

security-audit:
	@echo "Running security audit..."
	cd rust && cargo audit

fuzz:
	@echo "Running fuzz tests (short)..."
	cd rust && cargo +nightly fuzz run fuzz_token_parsing -- -max_total_time=30
	cd rust && cargo +nightly fuzz run fuzz_encryption -- -max_total_time=30

fuzz-long:
	@echo "Running fuzz tests (long)..."
	cd rust && for target in fuzz_token_parsing fuzz_signature_verification fuzz_proof_validation fuzz_policy_evaluation fuzz_encryption; do \
		cargo +nightly fuzz run $$target -- -max_total_time=300; \
	done

# ============================================
# Documentation
# ============================================

docs: docs-rust docs-python
	@echo "Documentation generated"

docs-rust:
	@echo "Generating Rust docs..."
	cd rust && cargo doc --no-deps --all-features

docs-python:
	@echo "Generating Python docs..."
	cd sdks/python && pdoc --html --output-dir docs qauth || true

docs-serve:
	@echo "Serving Rust docs..."
	cd rust && cargo doc --no-deps --all-features --open

# ============================================
# Publish
# ============================================

publish: publish-check
	@echo "Publishing packages..."
	@echo "Run 'make publish-rust', 'make publish-python', etc. individually"

publish-check:
	@echo "Checking publish readiness..."
	cd rust && cargo publish --dry-run
	cd sdks/python && python -m build && twine check dist/*

publish-rust:
	@echo "Publishing to crates.io..."
	cd rust && cargo publish

publish-python:
	@echo "Publishing to PyPI..."
	cd sdks/python && python -m build && twine upload dist/*

publish-typescript:
	@echo "Publishing to npm..."
	cd sdks/typescript && npm publish --access public

# ============================================
# Clean
# ============================================

clean:
	@echo "Cleaning build artifacts..."
	cd rust && cargo clean
	rm -rf sdks/python/dist sdks/python/*.egg-info sdks/python/.pytest_cache
	rm -rf sdks/typescript/dist sdks/typescript/node_modules
	rm -rf sdks/go/go.sum

# ============================================
# Development
# ============================================

dev-setup:
	@echo "Setting up development environment..."
	rustup component add rustfmt clippy
	cargo install cargo-audit cargo-tarpaulin cargo-fuzz
	cd sdks/python && pip install -e ".[dev]"
	cd sdks/typescript && npm install
	cd sdks/go && go mod download

watch:
	@echo "Watching for changes..."
	cargo watch -x test

bench:
	@echo "Running benchmarks..."
	cd rust && cargo bench

# ============================================
# CI
# ============================================

ci: fmt-check lint test security-audit
	@echo "CI checks complete"

# ============================================
# Help
# ============================================

help:
	@echo "QAuth Makefile"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  all           - Format, lint, test, and build"
	@echo "  build         - Build all SDKs"
	@echo "  test          - Run all tests"
	@echo "  lint          - Run all linters"
	@echo "  fmt           - Format all code"
	@echo "  security      - Run security checks and fuzzing"
	@echo "  docs          - Generate documentation"
	@echo "  publish       - Publish packages (dry-run)"
	@echo "  clean         - Remove build artifacts"
	@echo "  dev-setup     - Set up development environment"
	@echo "  ci            - Run CI checks"
	@echo "  help          - Show this help"
	@echo ""
	@echo "Individual targets:"
	@echo "  build-rust, build-python, build-typescript, build-go"
	@echo "  test-rust, test-python, test-typescript, test-go"
	@echo "  lint-rust, lint-python, lint-typescript, lint-go"
	@echo "  fmt-rust, fmt-python, fmt-typescript, fmt-go"
	@echo "  publish-rust, publish-python, publish-typescript"
