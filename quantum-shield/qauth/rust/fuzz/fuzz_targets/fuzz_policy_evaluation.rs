//! Fuzz test for policy evaluation
//!
//! Tests that policy evaluation doesn't panic on malformed input.

#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use qauth::policy::{PolicyEngine, Policy, PolicyRule, Effect};

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    subject: String,
    resource: String,
    action: String,
    rule_resource: String,
    rule_actions: Vec<String>,
}

fuzz_target!(|input: FuzzInput| {
    // Create a policy engine with fuzzed rules
    let mut engine = PolicyEngine::new();

    let policy = Policy {
        id: "fuzz-policy".to_string(),
        version: "1.0".to_string(),
        rules: vec![
            PolicyRule {
                effect: Effect::Allow,
                resources: vec![input.rule_resource.clone()],
                actions: input.rule_actions.clone(),
                conditions: Default::default(),
            },
        ],
    };

    // Loading and evaluation should never panic
    let _ = engine.load_policy(policy);
    let _ = engine.evaluate(&input.subject, &input.resource, &input.action);
});
