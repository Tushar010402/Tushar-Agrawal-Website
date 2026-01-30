//! Token revocation system
//!
//! Implements built-in revocation with caching and bloom filter support.

use crate::error::{ErrorCode, QAuthError, Result};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

/// Default cache TTL in seconds
pub const DEFAULT_CACHE_TTL_SECONDS: i64 = 300; // 5 minutes

/// Maximum offline validity in seconds
pub const MAX_OFFLINE_VALIDITY_SECONDS: i64 = 300; // 5 minutes

/// Revocation reason
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RevocationReason {
    /// User initiated logout
    UserLogout,
    /// Password changed
    PasswordChanged,
    /// User account disabled
    AccountDisabled,
    /// Token compromised
    TokenCompromised,
    /// Admin revocation
    AdminRevoked,
    /// Session timeout
    SessionTimeout,
    /// Security violation
    SecurityViolation,
    /// Other reason
    Other(String),
}

/// Revocation entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevocationEntry {
    /// Revocation ID (from token's rid field)
    pub revocation_id: [u8; 16],
    /// When the token was revoked
    pub revoked_at: DateTime<Utc>,
    /// Reason for revocation
    pub reason: RevocationReason,
    /// Subject ID (for revoking all tokens for a user)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subject_id: Option<Vec<u8>>,
    /// Token expiration (for cleanup)
    pub token_expiry: DateTime<Utc>,
}

impl RevocationEntry {
    /// Create a new revocation entry
    pub fn new(
        revocation_id: [u8; 16],
        reason: RevocationReason,
        token_expiry: DateTime<Utc>,
    ) -> Self {
        Self {
            revocation_id,
            revoked_at: Utc::now(),
            reason,
            subject_id: None,
            token_expiry,
        }
    }

    /// Set subject ID for subject-wide revocation
    pub fn with_subject(mut self, subject_id: Vec<u8>) -> Self {
        self.subject_id = Some(subject_id);
        self
    }
}

/// Revocation status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevocationStatus {
    /// Whether the token is revoked
    pub revoked: bool,
    /// When it was revoked (if revoked)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revoked_at: Option<DateTime<Utc>>,
    /// Revocation reason (if revoked)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<RevocationReason>,
}

impl RevocationStatus {
    /// Create a not-revoked status
    pub fn not_revoked() -> Self {
        Self {
            revoked: false,
            revoked_at: None,
            reason: None,
        }
    }

    /// Create a revoked status
    pub fn revoked(entry: &RevocationEntry) -> Self {
        Self {
            revoked: true,
            revoked_at: Some(entry.revoked_at),
            reason: Some(entry.reason.clone()),
        }
    }
}

/// Cached revocation status
struct CachedStatus {
    status: RevocationStatus,
    cached_at: DateTime<Utc>,
}

/// Revocation cache
pub struct RevocationCache {
    /// Cache entries keyed by revocation ID
    entries: RwLock<HashMap<[u8; 16], CachedStatus>>,
    /// Subject-level revocation times
    subject_revocations: RwLock<HashMap<Vec<u8>, DateTime<Utc>>>,
    /// Cache TTL
    ttl: Duration,
}

impl RevocationCache {
    /// Create a new cache with default TTL
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
            subject_revocations: RwLock::new(HashMap::new()),
            ttl: Duration::seconds(DEFAULT_CACHE_TTL_SECONDS),
        }
    }

    /// Create with custom TTL
    pub fn with_ttl(ttl_seconds: i64) -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
            subject_revocations: RwLock::new(HashMap::new()),
            ttl: Duration::seconds(ttl_seconds),
        }
    }

    /// Get cached status
    pub fn get(&self, revocation_id: &[u8; 16]) -> Option<RevocationStatus> {
        let entries = self.entries.read().unwrap();
        if let Some(cached) = entries.get(revocation_id) {
            if Utc::now() - cached.cached_at < self.ttl {
                return Some(cached.status.clone());
            }
        }
        None
    }

    /// Cache a status
    pub fn set(&self, revocation_id: [u8; 16], status: RevocationStatus) {
        let mut entries = self.entries.write().unwrap();
        entries.insert(
            revocation_id,
            CachedStatus {
                status,
                cached_at: Utc::now(),
            },
        );
    }

    /// Check if subject's tokens are revoked
    pub fn is_subject_revoked(&self, subject_id: &[u8], token_iat: DateTime<Utc>) -> bool {
        let revocations = self.subject_revocations.read().unwrap();
        if let Some(revoked_at) = revocations.get(subject_id) {
            return token_iat < *revoked_at;
        }
        false
    }

    /// Mark subject as revoked
    pub fn revoke_subject(&self, subject_id: Vec<u8>) {
        let mut revocations = self.subject_revocations.write().unwrap();
        revocations.insert(subject_id, Utc::now());
    }

    /// Clean up expired entries
    pub fn cleanup(&self) {
        let now = Utc::now();
        let mut entries = self.entries.write().unwrap();
        entries.retain(|_, cached| now - cached.cached_at < self.ttl);
    }
}

impl Default for RevocationCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple bloom filter for compact revocation list
pub struct RevocationBloomFilter {
    /// Bit array
    bits: Vec<u64>,
    /// Number of hash functions
    num_hashes: usize,
    /// Filter size in bits
    size_bits: usize,
}

impl RevocationBloomFilter {
    /// Create a new bloom filter
    ///
    /// # Arguments
    /// * `expected_items` - Expected number of items
    /// * `false_positive_rate` - Desired false positive rate (e.g., 0.01 for 1%)
    pub fn new(expected_items: usize, false_positive_rate: f64) -> Self {
        // Calculate optimal size and number of hash functions
        let size_bits = Self::optimal_size(expected_items, false_positive_rate);
        let num_hashes = Self::optimal_hashes(size_bits, expected_items);

        let num_u64s = (size_bits + 63) / 64;

        Self {
            bits: vec![0u64; num_u64s],
            num_hashes,
            size_bits,
        }
    }

    fn optimal_size(n: usize, p: f64) -> usize {
        let ln2_squared = std::f64::consts::LN_2 * std::f64::consts::LN_2;
        (-(n as f64 * p.ln()) / ln2_squared).ceil() as usize
    }

    fn optimal_hashes(m: usize, n: usize) -> usize {
        ((m as f64 / n as f64) * std::f64::consts::LN_2).ceil() as usize
    }

    /// Add a revocation ID to the filter
    pub fn add(&mut self, revocation_id: &[u8; 16]) {
        for i in 0..self.num_hashes {
            let hash = self.hash(revocation_id, i);
            let bit_index = hash % self.size_bits;
            let word_index = bit_index / 64;
            let bit_position = bit_index % 64;
            self.bits[word_index] |= 1u64 << bit_position;
        }
    }

    /// Check if a revocation ID might be in the filter
    pub fn might_contain(&self, revocation_id: &[u8; 16]) -> bool {
        for i in 0..self.num_hashes {
            let hash = self.hash(revocation_id, i);
            let bit_index = hash % self.size_bits;
            let word_index = bit_index / 64;
            let bit_position = bit_index % 64;
            if (self.bits[word_index] & (1u64 << bit_position)) == 0 {
                return false;
            }
        }
        true
    }

    /// Hash function using FNV-1a with seed
    fn hash(&self, data: &[u8], seed: usize) -> usize {
        let mut hash: u64 = 14695981039346656037u64.wrapping_add(seed as u64);
        for byte in data {
            hash ^= *byte as u64;
            hash = hash.wrapping_mul(1099511628211);
        }
        hash as usize
    }

    /// Serialize to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&(self.num_hashes as u32).to_be_bytes());
        bytes.extend_from_slice(&(self.size_bits as u32).to_be_bytes());
        for word in &self.bits {
            bytes.extend_from_slice(&word.to_be_bytes());
        }
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 8 {
            return Err(QAuthError::InvalidInput("Bloom filter too short".into()));
        }

        let num_hashes = u32::from_be_bytes(bytes[0..4].try_into().unwrap()) as usize;
        let size_bits = u32::from_be_bytes(bytes[4..8].try_into().unwrap()) as usize;
        let num_u64s = (size_bits + 63) / 64;

        if bytes.len() < 8 + num_u64s * 8 {
            return Err(QAuthError::InvalidInput("Bloom filter data too short".into()));
        }

        let mut bits = Vec::with_capacity(num_u64s);
        for i in 0..num_u64s {
            let start = 8 + i * 8;
            let word = u64::from_be_bytes(bytes[start..start + 8].try_into().unwrap());
            bits.push(word);
        }

        Ok(Self {
            bits,
            num_hashes,
            size_bits,
        })
    }
}

/// Revocation store trait
pub trait RevocationStore: Send + Sync {
    /// Check if a token is revoked
    fn is_revoked(&self, revocation_id: &[u8; 16]) -> Result<RevocationStatus>;

    /// Revoke a token
    fn revoke(&self, entry: RevocationEntry) -> Result<()>;

    /// Revoke all tokens for a subject
    fn revoke_subject(&self, subject_id: &[u8], reason: RevocationReason) -> Result<()>;

    /// Get bloom filter of revoked tokens
    fn get_bloom_filter(&self) -> Result<RevocationBloomFilter>;
}

/// In-memory revocation store (for testing/single-instance deployments)
pub struct InMemoryRevocationStore {
    /// Revoked tokens
    revocations: RwLock<HashMap<[u8; 16], RevocationEntry>>,
    /// Subject-level revocations
    subject_revocations: RwLock<HashMap<Vec<u8>, DateTime<Utc>>>,
}

impl InMemoryRevocationStore {
    /// Create a new in-memory store
    pub fn new() -> Self {
        Self {
            revocations: RwLock::new(HashMap::new()),
            subject_revocations: RwLock::new(HashMap::new()),
        }
    }

    /// Clean up expired revocations
    pub fn cleanup(&self) {
        let now = Utc::now();
        let mut revocations = self.revocations.write().unwrap();
        revocations.retain(|_, entry| entry.token_expiry > now);
    }
}

impl Default for InMemoryRevocationStore {
    fn default() -> Self {
        Self::new()
    }
}

impl RevocationStore for InMemoryRevocationStore {
    fn is_revoked(&self, revocation_id: &[u8; 16]) -> Result<RevocationStatus> {
        let revocations = self.revocations.read().unwrap();
        if let Some(entry) = revocations.get(revocation_id) {
            Ok(RevocationStatus::revoked(entry))
        } else {
            Ok(RevocationStatus::not_revoked())
        }
    }

    fn revoke(&self, entry: RevocationEntry) -> Result<()> {
        let mut revocations = self.revocations.write().unwrap();
        revocations.insert(entry.revocation_id, entry);
        Ok(())
    }

    fn revoke_subject(&self, subject_id: &[u8], reason: RevocationReason) -> Result<()> {
        let mut subject_revocations = self.subject_revocations.write().unwrap();
        subject_revocations.insert(subject_id.to_vec(), Utc::now());
        Ok(())
    }

    fn get_bloom_filter(&self) -> Result<RevocationBloomFilter> {
        let revocations = self.revocations.read().unwrap();
        let mut filter = RevocationBloomFilter::new(revocations.len().max(100), 0.01);
        for id in revocations.keys() {
            filter.add(id);
        }
        Ok(filter)
    }
}

/// Revocation checker with caching
pub struct RevocationChecker {
    store: Arc<dyn RevocationStore>,
    cache: RevocationCache,
    bloom_filter: RwLock<Option<RevocationBloomFilter>>,
    bloom_filter_updated: RwLock<DateTime<Utc>>,
}

impl RevocationChecker {
    /// Create a new checker
    pub fn new(store: Arc<dyn RevocationStore>) -> Self {
        Self {
            store,
            cache: RevocationCache::new(),
            bloom_filter: RwLock::new(None),
            bloom_filter_updated: RwLock::new(DateTime::UNIX_EPOCH.into()),
        }
    }

    /// Create with custom cache TTL
    pub fn with_cache_ttl(store: Arc<dyn RevocationStore>, ttl_seconds: i64) -> Self {
        Self {
            store,
            cache: RevocationCache::with_ttl(ttl_seconds),
            bloom_filter: RwLock::new(None),
            bloom_filter_updated: RwLock::new(DateTime::UNIX_EPOCH.into()),
        }
    }

    /// Check if a token is revoked
    pub fn is_revoked(&self, revocation_id: &[u8; 16]) -> Result<bool> {
        // 1. Check cache first
        if let Some(status) = self.cache.get(revocation_id) {
            return Ok(status.revoked);
        }

        // 2. Check bloom filter (quick negative check)
        {
            let filter = self.bloom_filter.read().unwrap();
            if let Some(ref bf) = *filter {
                if !bf.might_contain(revocation_id) {
                    // Definitely not revoked
                    self.cache.set(*revocation_id, RevocationStatus::not_revoked());
                    return Ok(false);
                }
            }
        }

        // 3. Check the store
        let status = self.store.is_revoked(revocation_id)?;
        self.cache.set(*revocation_id, status.clone());

        Ok(status.revoked)
    }

    /// Check if a token is revoked, including subject-level revocation
    pub fn is_token_revoked(
        &self,
        revocation_id: &[u8; 16],
        subject_id: &[u8],
        token_iat: DateTime<Utc>,
    ) -> Result<bool> {
        // Check subject-level revocation first
        if self.cache.is_subject_revoked(subject_id, token_iat) {
            return Ok(true);
        }

        // Check token-specific revocation
        self.is_revoked(revocation_id)
    }

    /// Refresh the bloom filter
    pub fn refresh_bloom_filter(&self) -> Result<()> {
        let filter = self.store.get_bloom_filter()?;
        let mut bf = self.bloom_filter.write().unwrap();
        *bf = Some(filter);
        let mut updated = self.bloom_filter_updated.write().unwrap();
        *updated = Utc::now();
        Ok(())
    }

    /// Revoke a token
    pub fn revoke(
        &self,
        revocation_id: [u8; 16],
        reason: RevocationReason,
        token_expiry: DateTime<Utc>,
    ) -> Result<()> {
        let entry = RevocationEntry::new(revocation_id, reason, token_expiry);
        self.store.revoke(entry)?;

        // Invalidate cache for this token
        self.cache.set(revocation_id, RevocationStatus {
            revoked: true,
            revoked_at: Some(Utc::now()),
            reason: None,
        });

        Ok(())
    }

    /// Revoke all tokens for a subject
    pub fn revoke_subject(&self, subject_id: &[u8], reason: RevocationReason) -> Result<()> {
        self.store.revoke_subject(subject_id, reason)?;
        self.cache.revoke_subject(subject_id.to_vec());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revocation_store() {
        let store = InMemoryRevocationStore::new();

        let revocation_id: [u8; 16] = rand::random();

        // Initially not revoked
        let status = store.is_revoked(&revocation_id).unwrap();
        assert!(!status.revoked);

        // Revoke it
        let entry = RevocationEntry::new(
            revocation_id,
            RevocationReason::UserLogout,
            Utc::now() + Duration::hours(1),
        );
        store.revoke(entry).unwrap();

        // Now it's revoked
        let status = store.is_revoked(&revocation_id).unwrap();
        assert!(status.revoked);
        assert_eq!(status.reason, Some(RevocationReason::UserLogout));
    }

    #[test]
    fn test_revocation_cache() {
        let cache = RevocationCache::with_ttl(1); // 1 second TTL

        let revocation_id: [u8; 16] = rand::random();

        // Cache a status
        cache.set(revocation_id, RevocationStatus::not_revoked());

        // Should be in cache
        let status = cache.get(&revocation_id);
        assert!(status.is_some());
        assert!(!status.unwrap().revoked);

        // Wait for TTL to expire
        std::thread::sleep(std::time::Duration::from_secs(2));

        // Should be expired
        let status = cache.get(&revocation_id);
        assert!(status.is_none());
    }

    #[test]
    fn test_bloom_filter() {
        let mut filter = RevocationBloomFilter::new(1000, 0.01);

        let id1: [u8; 16] = rand::random();
        let id2: [u8; 16] = rand::random();

        // Add id1
        filter.add(&id1);

        // id1 should be found
        assert!(filter.might_contain(&id1));

        // id2 likely not found (with very high probability)
        // Note: false positives are possible, so we don't assert !might_contain
    }

    #[test]
    fn test_bloom_filter_serialization() {
        let mut filter = RevocationBloomFilter::new(100, 0.01);

        let id: [u8; 16] = rand::random();
        filter.add(&id);

        let bytes = filter.to_bytes();
        let restored = RevocationBloomFilter::from_bytes(&bytes).unwrap();

        assert!(restored.might_contain(&id));
    }

    #[test]
    fn test_revocation_checker() {
        let store = Arc::new(InMemoryRevocationStore::new());
        let checker = RevocationChecker::new(store);

        let revocation_id: [u8; 16] = rand::random();

        // Not revoked
        assert!(!checker.is_revoked(&revocation_id).unwrap());

        // Revoke it
        checker
            .revoke(
                revocation_id,
                RevocationReason::TokenCompromised,
                Utc::now() + Duration::hours(1),
            )
            .unwrap();

        // Now revoked
        assert!(checker.is_revoked(&revocation_id).unwrap());
    }

    #[test]
    fn test_subject_revocation() {
        let store = Arc::new(InMemoryRevocationStore::new());
        let checker = RevocationChecker::new(store);

        let subject_id = b"user-123";
        let revocation_id: [u8; 16] = rand::random();
        let token_iat = Utc::now() - Duration::minutes(5);

        // Token issued before revocation, not revoked yet
        assert!(!checker.is_token_revoked(&revocation_id, subject_id, token_iat).unwrap());

        // Revoke all tokens for subject
        checker
            .revoke_subject(subject_id, RevocationReason::PasswordChanged)
            .unwrap();

        // Old token should now be revoked
        assert!(checker.is_token_revoked(&revocation_id, subject_id, token_iat).unwrap());

        // New token (issued after revocation) would not be affected
        let new_token_iat = Utc::now() + Duration::seconds(1);
        let new_revocation_id: [u8; 16] = rand::random();
        // Note: In a real scenario, we'd need to wait or mock time
    }
}
