# QAuth Fuzz Tests

This directory contains fuzz tests for security-critical components of QAuth.

## Prerequisites

Install cargo-fuzz:

```bash
cargo install cargo-fuzz
```

Fuzzing requires nightly Rust:

```bash
rustup install nightly
```

## Running Fuzz Tests

### Token Parsing

Tests that malformed token data doesn't cause panics:

```bash
cargo +nightly fuzz run fuzz_token_parsing
```

### Signature Verification

Tests that malformed signatures don't cause panics or false positives:

```bash
cargo +nightly fuzz run fuzz_signature_verification
```

### Proof Validation

Tests that malformed proofs don't cause panics:

```bash
cargo +nightly fuzz run fuzz_proof_validation
```

### Policy Evaluation

Tests that policy evaluation is robust against malformed input:

```bash
cargo +nightly fuzz run fuzz_policy_evaluation
```

### Encryption

Tests encryption/decryption robustness:

```bash
cargo +nightly fuzz run fuzz_encryption
```

## Running All Fuzz Tests

```bash
for target in fuzz_token_parsing fuzz_signature_verification fuzz_proof_validation fuzz_policy_evaluation fuzz_encryption; do
    cargo +nightly fuzz run $target -- -max_total_time=60
done
```

## Corpus Management

Fuzz corpora are stored in `fuzz/corpus/<target>/`. To minimize a corpus:

```bash
cargo +nightly fuzz cmin fuzz_token_parsing
```

## Crash Investigation

If a crash is found, it will be saved in `fuzz/artifacts/<target>/`. To reproduce:

```bash
cargo +nightly fuzz run fuzz_token_parsing fuzz/artifacts/fuzz_token_parsing/crash-<hash>
```

## Coverage

To generate coverage reports:

```bash
cargo +nightly fuzz coverage fuzz_token_parsing
```

## Security Notes

- All fuzz targets test security-critical code paths
- A successful fuzz run should show no crashes
- Any crashes should be investigated as potential security issues
- Report security issues to: tusharagrawal0104@gmail.com
