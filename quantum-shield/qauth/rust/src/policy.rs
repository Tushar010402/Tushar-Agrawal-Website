//! Policy engine for fine-grained authorization
//!
//! Implements the QAuth Policy Language (QPL) as specified in QAUTH-POLICY.md

use crate::error::{QAuthError, Result};
use chrono::{DateTime, Datelike, NaiveTime, Timelike, Utc, Weekday};
use glob_match::glob_match;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::IpAddr;
use std::str::FromStr;

/// Policy effect
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Effect {
    Allow,
    Deny,
}

/// Policy document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    /// Unique policy identifier (URN)
    pub id: String,
    /// Policy version
    pub version: String,
    /// Human-readable name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Policy description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Issuing authority URL
    pub issuer: String,
    /// Policy activation time
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_from: Option<DateTime<Utc>>,
    /// Policy expiration time
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid_until: Option<DateTime<Utc>>,
    /// Parent policy to extend
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extends: Option<String>,
    /// Authorization rules
    pub rules: Vec<Rule>,
    /// Default behavior settings
    #[serde(default)]
    pub defaults: PolicyDefaults,
    /// Custom metadata
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Default policy behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDefaults {
    /// Default effect when no rules match
    #[serde(default = "default_deny")]
    pub effect: Effect,
    /// Whether to audit unmatched requests
    #[serde(default)]
    pub audit_unmatched: bool,
    /// Require explicit allow
    #[serde(default = "default_true")]
    pub require_explicit_allow: bool,
}

fn default_deny() -> Effect {
    Effect::Deny
}

fn default_true() -> bool {
    true
}

impl Default for PolicyDefaults {
    fn default() -> Self {
        Self {
            effect: Effect::Deny,
            audit_unmatched: false,
            require_explicit_allow: true,
        }
    }
}

/// Authorization rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    /// Rule identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// Rule effect
    pub effect: Effect,
    /// Resource patterns
    pub resources: Vec<String>,
    /// Permitted actions
    pub actions: Vec<String>,
    /// Contextual conditions
    #[serde(default)]
    pub conditions: Conditions,
    /// Rule priority (higher = evaluated first)
    #[serde(default)]
    pub priority: i32,
    /// Audit configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audit: Option<AuditConfig>,
}

/// Rule conditions
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Conditions {
    /// Time-based conditions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<TimeCondition>,
    /// IP-based conditions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<IpCondition>,
    /// Device conditions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device: Option<DeviceCondition>,
    /// MFA conditions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mfa: Option<MfaCondition>,
    /// Relationship conditions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationship: Option<RelationshipCondition>,
    /// Custom attribute conditions
    #[serde(default)]
    pub custom: HashMap<String, CustomCondition>,
}

/// Time-based condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeCondition {
    /// Start time (HH:MM)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<String>,
    /// End time (HH:MM)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// Allowed days
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<Vec<String>>,
    /// Timezone
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timezone: Option<String>,
    /// Exclude holidays
    #[serde(default)]
    pub not_holidays: bool,
}

/// IP-based condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpCondition {
    /// Allowed IP ranges (CIDR)
    #[serde(default)]
    pub allow_ranges: Vec<String>,
    /// Denied IP ranges (CIDR)
    #[serde(default)]
    pub deny_ranges: Vec<String>,
    /// Require VPN
    #[serde(default)]
    pub require_vpn: bool,
    /// Allowed countries
    #[serde(default)]
    pub geo_allow: Vec<String>,
    /// Denied countries
    #[serde(default)]
    pub geo_deny: Vec<String>,
}

/// Device condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCondition {
    /// Allowed device types
    #[serde(default)]
    pub types: Vec<String>,
    /// Allowed operating systems
    #[serde(default)]
    pub os: Vec<String>,
    /// Require managed device
    #[serde(default)]
    pub managed: bool,
    /// Require device attestation
    #[serde(default)]
    pub attestation_required: bool,
    /// Minimum security level
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_security_level: Option<i32>,
}

/// MFA condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfaCondition {
    /// Require MFA
    #[serde(default)]
    pub required: bool,
    /// Allowed MFA methods
    #[serde(default)]
    pub methods: Vec<String>,
    /// Maximum MFA age in minutes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_age_minutes: Option<i32>,
    /// Actions requiring step-up MFA
    #[serde(default)]
    pub step_up_for: Vec<String>,
}

/// Relationship condition (ReBAC)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipCondition {
    /// Subject's relationship to resource
    pub subject_is: String,
    /// Whether to check against the resource
    #[serde(default)]
    pub of_resource: bool,
}

/// Custom attribute condition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CustomCondition {
    /// Equality check
    Eq { eq: serde_json::Value },
    /// Non-equality check
    Ne { ne: serde_json::Value },
    /// Greater than
    Gt { gt: serde_json::Value },
    /// Greater than or equal
    Gte { gte: serde_json::Value },
    /// Less than
    Lt { lt: serde_json::Value },
    /// Less than or equal
    Lte { lte: serde_json::Value },
    /// In array
    In { r#in: Vec<serde_json::Value> },
    /// Not in array
    NotIn { not_in: Vec<serde_json::Value> },
    /// String contains
    Contains { contains: String },
    /// Regex match
    Matches { matches: String },
}

/// Audit configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditConfig {
    /// Audit level
    #[serde(default = "default_audit_level")]
    pub level: String,
    /// Log request details
    #[serde(default)]
    pub log_request: bool,
    /// Log response details
    #[serde(default)]
    pub log_response: bool,
    /// Notification emails
    #[serde(default)]
    pub notify: Vec<String>,
    /// Alert on deny
    #[serde(default)]
    pub alert_on_deny: bool,
}

fn default_audit_level() -> String {
    "medium".to_string()
}

/// Context for policy evaluation
#[derive(Debug, Clone, Default)]
pub struct EvaluationContext {
    /// Subject attributes
    pub subject: SubjectContext,
    /// Resource attributes
    pub resource: ResourceContext,
    /// Request attributes
    pub request: RequestContext,
    /// Environment attributes
    pub env: EnvironmentContext,
}

/// Subject context
#[derive(Debug, Clone, Default)]
pub struct SubjectContext {
    /// Subject ID
    pub id: String,
    /// Email
    pub email: Option<String>,
    /// Roles
    pub roles: Vec<String>,
    /// Groups
    pub groups: Vec<String>,
    /// Custom attributes
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Resource context
#[derive(Debug, Clone, Default)]
pub struct ResourceContext {
    /// Resource path
    pub path: String,
    /// Resource owner
    pub owner: Option<String>,
    /// Resource type
    pub resource_type: Option<String>,
    /// Custom attributes
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Request context
#[derive(Debug, Clone)]
pub struct RequestContext {
    /// Action being performed
    pub action: String,
    /// HTTP method
    pub method: Option<String>,
    /// Client IP
    pub ip: Option<String>,
    /// Request timestamp
    pub timestamp: DateTime<Utc>,
    /// Device type
    pub device_type: Option<String>,
    /// Operating system
    pub os: Option<String>,
    /// Is managed device
    pub managed_device: bool,
    /// Has device attestation
    pub device_attested: bool,
    /// Device security level
    pub security_level: Option<i32>,
    /// MFA verified
    pub mfa_verified: bool,
    /// MFA method used
    pub mfa_method: Option<String>,
    /// MFA verification time
    pub mfa_time: Option<DateTime<Utc>>,
    /// Is VPN connection
    pub is_vpn: bool,
    /// Geo country code
    pub geo_country: Option<String>,
}

impl Default for RequestContext {
    fn default() -> Self {
        Self {
            action: String::new(),
            method: None,
            ip: None,
            timestamp: Utc::now(),
            device_type: None,
            os: None,
            managed_device: false,
            device_attested: false,
            security_level: None,
            mfa_verified: false,
            mfa_method: None,
            mfa_time: None,
            is_vpn: false,
            geo_country: None,
        }
    }
}

/// Environment context
#[derive(Debug, Clone, Default)]
pub struct EnvironmentContext {
    /// Deployment region
    pub region: Option<String>,
    /// Custom attributes
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Policy evaluation result
#[derive(Debug, Clone)]
pub struct EvaluationResult {
    /// Final decision
    pub effect: Effect,
    /// Matching rule (if any)
    pub matched_rule: Option<String>,
    /// Reason for decision
    pub reason: String,
    /// Audit requirements
    pub audit: Option<AuditConfig>,
}

impl EvaluationResult {
    fn allow(rule_id: Option<String>) -> Self {
        Self {
            effect: Effect::Allow,
            matched_rule: rule_id,
            reason: "Allowed by policy rule".to_string(),
            audit: None,
        }
    }

    fn deny(reason: &str, rule_id: Option<String>) -> Self {
        Self {
            effect: Effect::Deny,
            matched_rule: rule_id,
            reason: reason.to_string(),
            audit: None,
        }
    }

    fn default_deny() -> Self {
        Self {
            effect: Effect::Deny,
            matched_rule: None,
            reason: "No matching rule, default deny".to_string(),
            audit: None,
        }
    }
}

/// Policy engine
pub struct PolicyEngine {
    /// Loaded policies
    policies: HashMap<String, Policy>,
}

impl PolicyEngine {
    /// Create a new policy engine
    pub fn new() -> Self {
        Self {
            policies: HashMap::new(),
        }
    }

    /// Load a policy
    pub fn load_policy(&mut self, policy: Policy) {
        self.policies.insert(policy.id.clone(), policy);
    }

    /// Load a policy from JSON
    pub fn load_policy_json(&mut self, json: &str) -> Result<()> {
        let policy: Policy =
            serde_json::from_str(json).map_err(|e| QAuthError::PolicyError(e.to_string()))?;
        self.load_policy(policy);
        Ok(())
    }

    /// Get a policy by ID
    pub fn get_policy(&self, id: &str) -> Option<&Policy> {
        self.policies.get(id)
    }

    /// Evaluate a policy
    pub fn evaluate(
        &self,
        policy_id: &str,
        context: &EvaluationContext,
    ) -> Result<EvaluationResult> {
        let policy = self
            .policies
            .get(policy_id)
            .ok_or_else(|| QAuthError::PolicyError(format!("Policy not found: {}", policy_id)))?;

        // Check policy validity period
        if let Some(valid_from) = policy.valid_from {
            if context.request.timestamp < valid_from {
                return Ok(EvaluationResult::deny("Policy not yet valid", None));
            }
        }
        if let Some(valid_until) = policy.valid_until {
            if context.request.timestamp > valid_until {
                return Ok(EvaluationResult::deny("Policy expired", None));
            }
        }

        // Sort rules by priority (descending)
        let mut rules: Vec<&Rule> = policy.rules.iter().collect();
        rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        // Evaluate rules
        for rule in rules {
            if self.matches_rule(rule, context)? {
                let mut result = match rule.effect {
                    Effect::Allow => EvaluationResult::allow(rule.id.clone()),
                    Effect::Deny => {
                        EvaluationResult::deny("Denied by policy rule", rule.id.clone())
                    }
                };
                result.audit = rule.audit.clone();
                return Ok(result);
            }
        }

        // No rule matched, apply default
        Ok(EvaluationResult::default_deny())
    }

    /// Check if a rule matches the context
    fn matches_rule(&self, rule: &Rule, context: &EvaluationContext) -> Result<bool> {
        // Check resource matches
        if !self.matches_resources(&rule.resources, &context.resource.path) {
            return Ok(false);
        }

        // Check action matches
        if !self.matches_actions(&rule.actions, &context.request.action) {
            return Ok(false);
        }

        // Check conditions
        if !self.matches_conditions(&rule.conditions, context)? {
            return Ok(false);
        }

        Ok(true)
    }

    /// Check if resource matches any pattern
    fn matches_resources(&self, patterns: &[String], resource: &str) -> bool {
        for pattern in patterns {
            if pattern == "*" || pattern == "**" {
                return true;
            }
            if glob_match(pattern, resource) {
                return true;
            }
        }
        false
    }

    /// Check if action matches
    fn matches_actions(&self, allowed: &[String], action: &str) -> bool {
        for a in allowed {
            if a == "*" || a == action {
                return true;
            }
        }
        false
    }

    /// Check all conditions
    fn matches_conditions(&self, conditions: &Conditions, context: &EvaluationContext) -> Result<bool> {
        // Time condition
        if let Some(ref time_cond) = conditions.time {
            if !self.matches_time_condition(time_cond, &context.request.timestamp)? {
                return Ok(false);
            }
        }

        // IP condition
        if let Some(ref ip_cond) = conditions.ip {
            if !self.matches_ip_condition(ip_cond, context)? {
                return Ok(false);
            }
        }

        // Device condition
        if let Some(ref device_cond) = conditions.device {
            if !self.matches_device_condition(device_cond, context) {
                return Ok(false);
            }
        }

        // MFA condition
        if let Some(ref mfa_cond) = conditions.mfa {
            if !self.matches_mfa_condition(mfa_cond, context) {
                return Ok(false);
            }
        }

        // Custom conditions
        for (key, cond) in &conditions.custom {
            if !self.matches_custom_condition(key, cond, context)? {
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Check time condition
    fn matches_time_condition(
        &self,
        cond: &TimeCondition,
        timestamp: &DateTime<Utc>,
    ) -> Result<bool> {
        let time = timestamp.time();

        // Check after time
        if let Some(ref after) = cond.after {
            let after_time = NaiveTime::parse_from_str(after, "%H:%M")
                .map_err(|_| QAuthError::PolicyError("Invalid time format".into()))?;
            if time < after_time {
                return Ok(false);
            }
        }

        // Check before time
        if let Some(ref before) = cond.before {
            let before_time = NaiveTime::parse_from_str(before, "%H:%M")
                .map_err(|_| QAuthError::PolicyError("Invalid time format".into()))?;
            if time > before_time {
                return Ok(false);
            }
        }

        // Check days
        if let Some(ref days) = cond.days {
            let day = timestamp.weekday();
            let day_str = match day {
                Weekday::Mon => "monday",
                Weekday::Tue => "tuesday",
                Weekday::Wed => "wednesday",
                Weekday::Thu => "thursday",
                Weekday::Fri => "friday",
                Weekday::Sat => "saturday",
                Weekday::Sun => "sunday",
            };
            if !days.iter().any(|d| d.to_lowercase() == day_str) {
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Check IP condition
    fn matches_ip_condition(&self, cond: &IpCondition, context: &EvaluationContext) -> Result<bool> {
        // Check VPN requirement
        if cond.require_vpn && !context.request.is_vpn {
            return Ok(false);
        }

        // Check geo restrictions
        if !cond.geo_allow.is_empty() {
            if let Some(ref country) = context.request.geo_country {
                if !cond.geo_allow.contains(country) {
                    return Ok(false);
                }
            } else {
                return Ok(false); // No geo info, can't verify
            }
        }

        if !cond.geo_deny.is_empty() {
            if let Some(ref country) = context.request.geo_country {
                if cond.geo_deny.contains(country) {
                    return Ok(false);
                }
            }
        }

        // Check IP ranges (simplified - full CIDR matching would need ip_network crate)
        if let Some(ref ip_str) = context.request.ip {
            if let Ok(ip) = IpAddr::from_str(ip_str) {
                // Check deny ranges first
                for range in &cond.deny_ranges {
                    if self.ip_in_range(&ip, range) {
                        return Ok(false);
                    }
                }

                // Check allow ranges if specified
                if !cond.allow_ranges.is_empty() {
                    let allowed = cond.allow_ranges.iter().any(|r| self.ip_in_range(&ip, r));
                    if !allowed {
                        return Ok(false);
                    }
                }
            }
        }

        Ok(true)
    }

    /// Simple IP range check (simplified version)
    fn ip_in_range(&self, ip: &IpAddr, range: &str) -> bool {
        // This is a simplified check - full CIDR matching would need a proper library
        if let Some((network, _prefix)) = range.split_once('/') {
            if let Ok(network_ip) = IpAddr::from_str(network) {
                // For simplicity, just check if the first octet matches for /8
                match (ip, network_ip) {
                    (IpAddr::V4(ip), IpAddr::V4(net)) => {
                        ip.octets()[0] == net.octets()[0]
                    }
                    _ => false,
                }
            } else {
                false
            }
        } else {
            // Exact match
            if let Ok(range_ip) = IpAddr::from_str(range) {
                ip == &range_ip
            } else {
                false
            }
        }
    }

    /// Check device condition
    fn matches_device_condition(&self, cond: &DeviceCondition, context: &EvaluationContext) -> bool {
        // Check device type
        if !cond.types.is_empty() {
            if let Some(ref dt) = context.request.device_type {
                if !cond.types.iter().any(|t| t.eq_ignore_ascii_case(dt)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check OS
        if !cond.os.is_empty() {
            if let Some(ref os) = context.request.os {
                if !cond.os.iter().any(|o| o.eq_ignore_ascii_case(os)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check managed device
        if cond.managed && !context.request.managed_device {
            return false;
        }

        // Check attestation
        if cond.attestation_required && !context.request.device_attested {
            return false;
        }

        // Check security level
        if let Some(min_level) = cond.min_security_level {
            if let Some(level) = context.request.security_level {
                if level < min_level {
                    return false;
                }
            } else {
                return false;
            }
        }

        true
    }

    /// Check MFA condition
    fn matches_mfa_condition(&self, cond: &MfaCondition, context: &EvaluationContext) -> bool {
        // Check if MFA is required
        if cond.required && !context.request.mfa_verified {
            return false;
        }

        // Check MFA method
        if !cond.methods.is_empty() && context.request.mfa_verified {
            if let Some(ref method) = context.request.mfa_method {
                if !cond.methods.iter().any(|m| m.eq_ignore_ascii_case(method)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check MFA age
        if let Some(max_age) = cond.max_age_minutes {
            if let Some(mfa_time) = context.request.mfa_time {
                let age_minutes = (context.request.timestamp - mfa_time).num_minutes();
                if age_minutes > max_age as i64 {
                    return false;
                }
            } else if context.request.mfa_verified {
                // MFA verified but no timestamp, can't verify age
                return false;
            }
        }

        // Check step-up requirements
        if cond.step_up_for.contains(&context.request.action) && !context.request.mfa_verified {
            return false;
        }

        true
    }

    /// Check custom condition
    fn matches_custom_condition(
        &self,
        key: &str,
        cond: &CustomCondition,
        context: &EvaluationContext,
    ) -> Result<bool> {
        // Look up the value in subject attributes
        let value = context
            .subject
            .attributes
            .get(key)
            .cloned()
            .unwrap_or(serde_json::Value::Null);

        match cond {
            CustomCondition::Eq { eq } => Ok(&value == eq),
            CustomCondition::Ne { ne } => Ok(&value != ne),
            CustomCondition::Gt { gt } => {
                Ok(self.compare_values(&value, gt).map(|o| o > 0).unwrap_or(false))
            }
            CustomCondition::Gte { gte } => {
                Ok(self.compare_values(&value, gte).map(|o| o >= 0).unwrap_or(false))
            }
            CustomCondition::Lt { lt } => {
                Ok(self.compare_values(&value, lt).map(|o| o < 0).unwrap_or(false))
            }
            CustomCondition::Lte { lte } => {
                Ok(self.compare_values(&value, lte).map(|o| o <= 0).unwrap_or(false))
            }
            CustomCondition::In { r#in } => Ok(r#in.contains(&value)),
            CustomCondition::NotIn { not_in } => Ok(!not_in.contains(&value)),
            CustomCondition::Contains { contains } => {
                if let serde_json::Value::String(s) = &value {
                    Ok(s.contains(contains))
                } else {
                    Ok(false)
                }
            }
            CustomCondition::Matches { matches } => {
                if let serde_json::Value::String(s) = &value {
                    let re = regex::Regex::new(matches)
                        .map_err(|e| QAuthError::PolicyError(e.to_string()))?;
                    Ok(re.is_match(s))
                } else {
                    Ok(false)
                }
            }
        }
    }

    /// Compare two JSON values
    fn compare_values(&self, a: &serde_json::Value, b: &serde_json::Value) -> Option<i32> {
        match (a, b) {
            (serde_json::Value::Number(a), serde_json::Value::Number(b)) => {
                let a = a.as_f64()?;
                let b = b.as_f64()?;
                Some(if a < b { -1 } else if a > b { 1 } else { 0 })
            }
            (serde_json::Value::String(a), serde_json::Value::String(b)) => Some(a.cmp(b) as i32),
            _ => None,
        }
    }
}

impl Default for PolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_policy() -> Policy {
        serde_json::from_str(
            r#"
            {
                "id": "urn:qauth:policy:test",
                "version": "2026-01-30",
                "issuer": "https://auth.example.com",
                "rules": [
                    {
                        "id": "rule-1",
                        "effect": "allow",
                        "resources": ["projects/*"],
                        "actions": ["read", "list"],
                        "priority": 100
                    },
                    {
                        "id": "rule-2",
                        "effect": "allow",
                        "resources": ["projects/123"],
                        "actions": ["read", "write", "delete"],
                        "priority": 200
                    },
                    {
                        "id": "rule-3",
                        "effect": "deny",
                        "resources": ["admin/**"],
                        "actions": ["*"],
                        "priority": 1000
                    }
                ],
                "defaults": {
                    "effect": "deny"
                }
            }
            "#,
        )
        .unwrap()
    }

    #[test]
    fn test_policy_loading() {
        let mut engine = PolicyEngine::new();
        let policy = create_test_policy();
        engine.load_policy(policy);

        assert!(engine.get_policy("urn:qauth:policy:test").is_some());
    }

    #[test]
    fn test_allow_read_projects() {
        let mut engine = PolicyEngine::new();
        engine.load_policy(create_test_policy());

        let context = EvaluationContext {
            resource: ResourceContext {
                path: "projects/456".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test", &context).unwrap();
        assert_eq!(result.effect, Effect::Allow);
    }

    #[test]
    fn test_allow_write_specific_project() {
        let mut engine = PolicyEngine::new();
        engine.load_policy(create_test_policy());

        let context = EvaluationContext {
            resource: ResourceContext {
                path: "projects/123".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "write".to_string(),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test", &context).unwrap();
        assert_eq!(result.effect, Effect::Allow);
        assert_eq!(result.matched_rule, Some("rule-2".to_string()));
    }

    #[test]
    fn test_deny_admin_access() {
        let mut engine = PolicyEngine::new();
        engine.load_policy(create_test_policy());

        let context = EvaluationContext {
            resource: ResourceContext {
                path: "admin/settings".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test", &context).unwrap();
        assert_eq!(result.effect, Effect::Deny);
    }

    #[test]
    fn test_deny_unmatched() {
        let mut engine = PolicyEngine::new();
        engine.load_policy(create_test_policy());

        let context = EvaluationContext {
            resource: ResourceContext {
                path: "unknown/resource".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test", &context).unwrap();
        assert_eq!(result.effect, Effect::Deny);
        assert!(result.matched_rule.is_none());
    }

    #[test]
    fn test_time_condition() {
        let policy: Policy = serde_json::from_str(
            r#"
            {
                "id": "urn:qauth:policy:time-test",
                "version": "2026-01-30",
                "issuer": "https://auth.example.com",
                "rules": [
                    {
                        "effect": "allow",
                        "resources": ["*"],
                        "actions": ["*"],
                        "conditions": {
                            "time": {
                                "after": "09:00",
                                "before": "17:00"
                            }
                        }
                    }
                ]
            }
            "#,
        )
        .unwrap();

        let mut engine = PolicyEngine::new();
        engine.load_policy(policy);

        // Test would depend on current time - in a real scenario, you'd mock the time
    }

    #[test]
    fn test_mfa_condition() {
        let policy: Policy = serde_json::from_str(
            r#"
            {
                "id": "urn:qauth:policy:mfa-test",
                "version": "2026-01-30",
                "issuer": "https://auth.example.com",
                "rules": [
                    {
                        "effect": "allow",
                        "resources": ["sensitive/*"],
                        "actions": ["*"],
                        "conditions": {
                            "mfa": {
                                "required": true,
                                "methods": ["totp", "webauthn"]
                            }
                        }
                    }
                ]
            }
            "#,
        )
        .unwrap();

        let mut engine = PolicyEngine::new();
        engine.load_policy(policy);

        // Without MFA
        let context_no_mfa = EvaluationContext {
            resource: ResourceContext {
                path: "sensitive/data".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                mfa_verified: false,
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:mfa-test", &context_no_mfa).unwrap();
        assert_eq!(result.effect, Effect::Deny);

        // With MFA
        let context_with_mfa = EvaluationContext {
            resource: ResourceContext {
                path: "sensitive/data".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                mfa_verified: true,
                mfa_method: Some("totp".to_string()),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:mfa-test", &context_with_mfa).unwrap();
        assert_eq!(result.effect, Effect::Allow);
    }

    #[test]
    fn test_custom_condition() {
        let policy: Policy = serde_json::from_str(
            r#"
            {
                "id": "urn:qauth:policy:custom-test",
                "version": "2026-01-30",
                "issuer": "https://auth.example.com",
                "rules": [
                    {
                        "effect": "allow",
                        "resources": ["*"],
                        "actions": ["*"],
                        "conditions": {
                            "custom": {
                                "role": {"in": ["admin", "superuser"]},
                                "level": {"gte": 3}
                            }
                        }
                    }
                ]
            }
            "#,
        )
        .unwrap();

        let mut engine = PolicyEngine::new();
        engine.load_policy(policy);

        // With matching attributes
        let mut attributes = HashMap::new();
        attributes.insert("role".to_string(), serde_json::json!("admin"));
        attributes.insert("level".to_string(), serde_json::json!(5));

        let context = EvaluationContext {
            subject: SubjectContext {
                attributes,
                ..Default::default()
            },
            resource: ResourceContext {
                path: "anything".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                timestamp: Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:custom-test", &context).unwrap();
        assert_eq!(result.effect, Effect::Allow);
    }
}
