//! QAuth CLI Tool
//!
//! A command-line interface for QuantumAuth operations.
//!
//! # Usage
//!
//! ```bash
//! # Generate issuer keys
//! qauth keygen --output keys.json
//!
//! # Create a token
//! qauth token create --keys keys.json --subject "user-123" --policy "urn:qauth:policy:default"
//!
//! # Validate a token
//! qauth token validate --keys keys.json --token "eyJ..."
//!
//! # Evaluate a policy
//! qauth policy eval --policy policy.json --context context.json
//! ```

use qauth::{
    crypto::{EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys},
    policy::{EvaluationContext, PolicyEngine},
    proof::ProofGenerator,
    token::{QToken, QTokenBuilder},
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Read};
use std::path::PathBuf;

/// CLI application
fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        print_help();
        std::process::exit(1);
    }

    let result = match args[1].as_str() {
        "keygen" => cmd_keygen(&args[2..]),
        "token" => cmd_token(&args[2..]),
        "proof" => cmd_proof(&args[2..]),
        "policy" => cmd_policy(&args[2..]),
        "help" | "--help" | "-h" => {
            print_help();
            Ok(())
        }
        "version" | "--version" | "-v" => {
            println!("qauth {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        }
        _ => {
            eprintln!("Unknown command: {}", args[1]);
            print_help();
            std::process::exit(1);
        }
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn print_help() {
    println!(
        r#"QAuth CLI - QuantumAuth Command Line Interface

USAGE:
    qauth <COMMAND> [OPTIONS]

COMMANDS:
    keygen      Generate issuer keys
    token       Create or validate tokens
    proof       Generate or validate proofs of possession
    policy      Evaluate authorization policies
    help        Show this help message
    version     Show version information

EXAMPLES:
    # Generate issuer keys and save to file
    qauth keygen --output keys.json

    # Create an access token
    qauth token create --keys keys.json --subject "user-123" --issuer "https://auth.example.com" --audience "https://api.example.com" --policy "urn:qauth:policy:default"

    # Validate a token
    qauth token validate --keys keys.json --token "eyJ..."

    # Generate a proof of possession
    qauth proof create --method GET --uri /api/resource --token "eyJ..."

    # Evaluate a policy
    qauth policy eval --policy policy.json --resource "projects/123" --action "read"

For more information, visit: https://github.com/tushar-agrawal/quantum-shield
"#
    );
}

// ============================================================================
// Key Generation
// ============================================================================

#[derive(Serialize, Deserialize)]
struct KeyFile {
    key_id: String,
    ed25519_public: String,
    ed25519_private: String,
    mldsa_public: String,
    mldsa_private: String,
    encryption_key: String,
}

fn cmd_keygen(args: &[String]) -> Result<(), String> {
    let mut output_path: Option<PathBuf> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--output" | "-o" => {
                i += 1;
                if i >= args.len() {
                    return Err("--output requires a path".to_string());
                }
                output_path = Some(PathBuf::from(&args[i]));
            }
            "--help" | "-h" => {
                println!(
                    r#"Generate issuer keys

USAGE:
    qauth keygen [OPTIONS]

OPTIONS:
    -o, --output <FILE>    Output file path (default: stdout)
    -h, --help             Show this help message
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    // Generate keys
    eprintln!("Generating issuer keys...");
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let key_file = KeyFile {
        key_id: hex::encode(signing_keys.key_id()),
        ed25519_public: hex::encode(signing_keys.ed25519.public_key_bytes()),
        ed25519_private: hex::encode(signing_keys.ed25519.private_key_bytes()),
        mldsa_public: hex::encode(signing_keys.mldsa.public_key_bytes()),
        mldsa_private: hex::encode(signing_keys.mldsa.private_key_bytes()),
        encryption_key: hex::encode(encryption_key.to_bytes()),
    };

    let json = serde_json::to_string_pretty(&key_file)
        .map_err(|e| format!("Failed to serialize keys: {}", e))?;

    match output_path {
        Some(path) => {
            fs::write(&path, &json)
                .map_err(|e| format!("Failed to write to {}: {}", path.display(), e))?;
            eprintln!("Keys saved to: {}", path.display());
        }
        None => {
            println!("{}", json);
        }
    }

    eprintln!("Key ID: {}", key_file.key_id);
    eprintln!("Ed25519 public key size: {} bytes", signing_keys.ed25519.public_key_bytes().len());
    eprintln!("ML-DSA-65 public key size: {} bytes", signing_keys.mldsa.public_key_bytes().len());

    Ok(())
}

// ============================================================================
// Token Operations
// ============================================================================

fn cmd_token(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        return Err("Token subcommand required: create, validate, decode".to_string());
    }

    match args[0].as_str() {
        "create" => cmd_token_create(&args[1..]),
        "validate" => cmd_token_validate(&args[1..]),
        "decode" => cmd_token_decode(&args[1..]),
        _ => Err(format!("Unknown token subcommand: {}", args[0])),
    }
}

fn cmd_token_create(args: &[String]) -> Result<(), String> {
    let mut keys_path: Option<PathBuf> = None;
    let mut subject: Option<String> = None;
    let mut issuer = "https://auth.example.com".to_string();
    let mut audience = "https://api.example.com".to_string();
    let mut policy_ref = "urn:qauth:policy:default".to_string();
    let mut validity: i64 = 3600;
    let mut claims: Vec<(String, String)> = Vec::new();

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--keys" | "-k" => {
                i += 1;
                if i >= args.len() {
                    return Err("--keys requires a path".to_string());
                }
                keys_path = Some(PathBuf::from(&args[i]));
            }
            "--subject" | "-s" => {
                i += 1;
                if i >= args.len() {
                    return Err("--subject requires a value".to_string());
                }
                subject = Some(args[i].clone());
            }
            "--issuer" | "-i" => {
                i += 1;
                if i >= args.len() {
                    return Err("--issuer requires a value".to_string());
                }
                issuer = args[i].clone();
            }
            "--audience" | "-a" => {
                i += 1;
                if i >= args.len() {
                    return Err("--audience requires a value".to_string());
                }
                audience = args[i].clone();
            }
            "--policy" | "-p" => {
                i += 1;
                if i >= args.len() {
                    return Err("--policy requires a value".to_string());
                }
                policy_ref = args[i].clone();
            }
            "--validity" | "-v" => {
                i += 1;
                if i >= args.len() {
                    return Err("--validity requires a value".to_string());
                }
                validity = args[i].parse().map_err(|_| "Invalid validity")?;
            }
            "--claim" | "-c" => {
                i += 1;
                if i >= args.len() {
                    return Err("--claim requires a value in format key=value".to_string());
                }
                let parts: Vec<&str> = args[i].splitn(2, '=').collect();
                if parts.len() != 2 {
                    return Err("--claim must be in format key=value".to_string());
                }
                claims.push((parts[0].to_string(), parts[1].to_string()));
            }
            "--help" | "-h" => {
                println!(
                    r#"Create an access token

USAGE:
    qauth token create [OPTIONS]

OPTIONS:
    -k, --keys <FILE>       Path to keys file (required)
    -s, --subject <VALUE>   Subject identifier (required)
    -i, --issuer <URL>      Issuer URL (default: https://auth.example.com)
    -a, --audience <URL>    Audience URL (default: https://api.example.com)
    -p, --policy <URN>      Policy reference (default: urn:qauth:policy:default)
    -v, --validity <SECS>   Validity in seconds (default: 3600)
    -c, --claim <K=V>       Add custom claim (can be repeated)
    -h, --help              Show this help message
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    let keys_path = keys_path.ok_or("--keys is required")?;
    let subject = subject.ok_or("--subject is required")?;

    // Load keys
    let key_json = fs::read_to_string(&keys_path)
        .map_err(|e| format!("Failed to read keys: {}", e))?;
    let key_file: KeyFile = serde_json::from_str(&key_json)
        .map_err(|e| format!("Failed to parse keys: {}", e))?;

    let signing_keys = load_signing_keys(&key_file)?;
    let encryption_key = load_encryption_key(&key_file)?;

    // Build token
    let mut builder = QTokenBuilder::access_token()
        .subject(subject.as_bytes().to_vec())
        .issuer(&issuer)
        .audience(&audience)
        .policy_ref(&policy_ref)
        .validity_seconds(validity);

    for (key, value) in claims {
        // Try to parse as JSON, otherwise treat as string
        let json_value: serde_json::Value = serde_json::from_str(&value)
            .unwrap_or_else(|_| serde_json::Value::String(value));
        builder = builder.claim(&key, json_value);
    }

    let token = builder
        .build(&signing_keys, &encryption_key)
        .map_err(|e| format!("Failed to create token: {}", e))?;

    let token_string = token.encode();

    println!("{}", token_string);

    eprintln!("\nToken created successfully:");
    eprintln!("  Size: {} bytes ({} chars)", token.to_bytes().len(), token_string.len());
    eprintln!("  Subject: {}", subject);
    eprintln!("  Issuer: {}", issuer);
    eprintln!("  Audience: {}", audience);
    eprintln!("  Policy: {}", policy_ref);
    eprintln!("  Validity: {} seconds", validity);

    Ok(())
}

fn cmd_token_validate(args: &[String]) -> Result<(), String> {
    let mut keys_path: Option<PathBuf> = None;
    let mut token_string: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--keys" | "-k" => {
                i += 1;
                if i >= args.len() {
                    return Err("--keys requires a path".to_string());
                }
                keys_path = Some(PathBuf::from(&args[i]));
            }
            "--token" | "-t" => {
                i += 1;
                if i >= args.len() {
                    return Err("--token requires a value".to_string());
                }
                token_string = Some(args[i].clone());
            }
            "--help" | "-h" => {
                println!(
                    r#"Validate a token

USAGE:
    qauth token validate [OPTIONS]

OPTIONS:
    -k, --keys <FILE>    Path to keys file (required)
    -t, --token <TOKEN>  Token to validate (or read from stdin)
    -h, --help           Show this help message
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    let keys_path = keys_path.ok_or("--keys is required")?;

    // Read token from argument or stdin
    let token_string = match token_string {
        Some(t) => t,
        None => {
            let mut buffer = String::new();
            io::stdin()
                .read_to_string(&mut buffer)
                .map_err(|e| format!("Failed to read stdin: {}", e))?;
            buffer.trim().to_string()
        }
    };

    // Load keys
    let key_json = fs::read_to_string(&keys_path)
        .map_err(|e| format!("Failed to read keys: {}", e))?;
    let key_file: KeyFile = serde_json::from_str(&key_json)
        .map_err(|e| format!("Failed to parse keys: {}", e))?;

    let verifying_keys = load_verifying_keys(&key_file)?;
    let encryption_key = load_encryption_key(&key_file)?;

    // Decode and validate
    let token = QToken::decode(&token_string)
        .map_err(|e| format!("Failed to decode token: {}", e))?;

    token.verify_signatures(&verifying_keys)
        .map_err(|e| format!("Signature verification failed: {}", e))?;

    let payload = token.decrypt_payload(&encryption_key)
        .map_err(|e| format!("Failed to decrypt payload: {}", e))?;

    if payload.is_expired() {
        return Err("Token is expired".to_string());
    }

    println!("Token is VALID\n");
    println!("Payload:");
    println!("  Subject: {}", String::from_utf8_lossy(&payload.sub));
    println!("  Issuer: {}", payload.iss);
    println!("  Audience: {:?}", payload.aud);
    println!("  Policy: {}", payload.pol);
    println!("  Expires: {}", payload.exp);
    println!("  Issued At: {}", payload.iat);

    if !payload.cst.is_empty() {
        println!("  Custom Claims:");
        for (key, value) in &payload.cst {
            println!("    {}: {}", key, value);
        }
    }

    Ok(())
}

fn cmd_token_decode(args: &[String]) -> Result<(), String> {
    let mut token_string: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--token" | "-t" => {
                i += 1;
                if i >= args.len() {
                    return Err("--token requires a value".to_string());
                }
                token_string = Some(args[i].clone());
            }
            "--help" | "-h" => {
                println!(
                    r#"Decode a token (without validation)

USAGE:
    qauth token decode [OPTIONS]

OPTIONS:
    -t, --token <TOKEN>  Token to decode (or read from stdin)
    -h, --help           Show this help message
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    // Read token from argument or stdin
    let token_string = match token_string {
        Some(t) => t,
        None => {
            let mut buffer = String::new();
            io::stdin()
                .read_to_string(&mut buffer)
                .map_err(|e| format!("Failed to read stdin: {}", e))?;
            buffer.trim().to_string()
        }
    };

    // Decode (no validation)
    let token = QToken::decode(&token_string)
        .map_err(|e| format!("Failed to decode token: {}", e))?;

    let token_bytes = token.to_bytes();
    println!("Token Header:");
    println!("  Version: {}", token.header.version);
    println!("  Type: {:?}", token.header.token_type);
    println!("  Key ID: {}", hex::encode(&token.header.key_id));
    println!("  Timestamp: {}", token.header.timestamp);
    println!("\nToken Size: {} bytes", token_bytes.len());

    Ok(())
}

// ============================================================================
// Proof Operations
// ============================================================================

fn cmd_proof(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        return Err("Proof subcommand required: create".to_string());
    }

    match args[0].as_str() {
        "create" => cmd_proof_create(&args[1..]),
        _ => Err(format!("Unknown proof subcommand: {}", args[0])),
    }
}

fn cmd_proof_create(args: &[String]) -> Result<(), String> {
    let mut method = "GET".to_string();
    let mut uri = "/".to_string();
    let mut token_string: Option<String> = None;
    let mut body: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--method" | "-m" => {
                i += 1;
                if i >= args.len() {
                    return Err("--method requires a value".to_string());
                }
                method = args[i].clone();
            }
            "--uri" | "-u" => {
                i += 1;
                if i >= args.len() {
                    return Err("--uri requires a value".to_string());
                }
                uri = args[i].clone();
            }
            "--token" | "-t" => {
                i += 1;
                if i >= args.len() {
                    return Err("--token requires a value".to_string());
                }
                token_string = Some(args[i].clone());
            }
            "--body" | "-b" => {
                i += 1;
                if i >= args.len() {
                    return Err("--body requires a value".to_string());
                }
                body = Some(args[i].clone());
            }
            "--help" | "-h" => {
                println!(
                    r#"Create a proof of possession

USAGE:
    qauth proof create [OPTIONS]

OPTIONS:
    -m, --method <METHOD>  HTTP method (default: GET)
    -u, --uri <URI>        Request URI (default: /)
    -t, --token <TOKEN>    Token (required)
    -b, --body <BODY>      Request body (optional)
    -h, --help             Show this help message

Note: This command generates a new ephemeral keypair for each invocation.
In production, you would reuse the same keypair across requests.
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    let token_string = token_string.ok_or("--token is required")?;

    // Generate ephemeral keypair
    let (proof_generator, public_key) = ProofGenerator::generate();

    let body_bytes = body.as_ref().map(|b| b.as_bytes());

    let proof = proof_generator.create_proof(
        &method,
        &uri,
        body_bytes,
        token_string.as_bytes(),
    );

    let proof_string = proof.encode()
        .map_err(|e| format!("Failed to encode proof: {}", e))?;

    println!("{}", proof_string);

    eprintln!("\nProof created:");
    eprintln!("  Method: {}", method);
    eprintln!("  URI: {}", uri);
    eprintln!("  Client Public Key: {}", hex::encode(&public_key));
    eprintln!("  Proof Size: {} bytes", proof_string.len());

    Ok(())
}

// ============================================================================
// Policy Operations
// ============================================================================

fn cmd_policy(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        return Err("Policy subcommand required: eval".to_string());
    }

    match args[0].as_str() {
        "eval" => cmd_policy_eval(&args[1..]),
        _ => Err(format!("Unknown policy subcommand: {}", args[0])),
    }
}

fn cmd_policy_eval(args: &[String]) -> Result<(), String> {
    let mut policy_path: Option<PathBuf> = None;
    let mut resource: Option<String> = None;
    let mut action: Option<String> = None;
    let mut subject_id = "anonymous".to_string();

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--policy" | "-p" => {
                i += 1;
                if i >= args.len() {
                    return Err("--policy requires a path".to_string());
                }
                policy_path = Some(PathBuf::from(&args[i]));
            }
            "--resource" | "-r" => {
                i += 1;
                if i >= args.len() {
                    return Err("--resource requires a value".to_string());
                }
                resource = Some(args[i].clone());
            }
            "--action" | "-a" => {
                i += 1;
                if i >= args.len() {
                    return Err("--action requires a value".to_string());
                }
                action = Some(args[i].clone());
            }
            "--subject" | "-s" => {
                i += 1;
                if i >= args.len() {
                    return Err("--subject requires a value".to_string());
                }
                subject_id = args[i].clone();
            }
            "--help" | "-h" => {
                println!(
                    r#"Evaluate a policy

USAGE:
    qauth policy eval [OPTIONS]

OPTIONS:
    -p, --policy <FILE>     Path to policy JSON file (required)
    -r, --resource <PATH>   Resource path (required)
    -a, --action <ACTION>   Action to evaluate (required)
    -s, --subject <ID>      Subject ID (default: anonymous)
    -h, --help              Show this help message
"#
                );
                return Ok(());
            }
            _ => {
                return Err(format!("Unknown option: {}", args[i]));
            }
        }
        i += 1;
    }

    let policy_path = policy_path.ok_or("--policy is required")?;
    let resource = resource.ok_or("--resource is required")?;
    let action = action.ok_or("--action is required")?;

    // Load policy
    let policy_json = fs::read_to_string(&policy_path)
        .map_err(|e| format!("Failed to read policy: {}", e))?;

    let mut engine = PolicyEngine::new();
    engine.load_policy_json(&policy_json)
        .map_err(|e| format!("Failed to load policy: {}", e))?;

    // Get policy ID from the JSON
    let policy_data: serde_json::Value = serde_json::from_str(&policy_json)
        .map_err(|e| format!("Invalid policy JSON: {}", e))?;
    let policy_id = policy_data["id"].as_str()
        .ok_or("Policy must have an 'id' field")?;

    // Build context
    let context = EvaluationContext {
        subject: qauth::policy::SubjectContext {
            id: subject_id.clone(),
            ..Default::default()
        },
        resource: qauth::policy::ResourceContext {
            path: resource.clone(),
            ..Default::default()
        },
        request: qauth::policy::RequestContext {
            action: action.clone(),
            ..Default::default()
        },
        ..Default::default()
    };

    // Evaluate
    let result = engine.evaluate(policy_id, &context)
        .map_err(|e| format!("Evaluation failed: {}", e))?;

    println!("Decision: {:?}", result.effect);
    println!("Matched Rule: {:?}", result.matched_rule);
    println!("Reason: {}", result.reason);
    println!();
    println!("Context:");
    println!("  Subject: {}", subject_id);
    println!("  Resource: {}", resource);
    println!("  Action: {}", action);

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

fn load_signing_keys(key_file: &KeyFile) -> Result<IssuerSigningKeys, String> {
    let ed25519_public = hex::decode(&key_file.ed25519_public)
        .map_err(|e| format!("Invalid ed25519 public key: {}", e))?;
    let ed25519_private = hex::decode(&key_file.ed25519_private)
        .map_err(|e| format!("Invalid ed25519 private key: {}", e))?;
    let mldsa_public = hex::decode(&key_file.mldsa_public)
        .map_err(|e| format!("Invalid ML-DSA public key: {}", e))?;
    let mldsa_private = hex::decode(&key_file.mldsa_private)
        .map_err(|e| format!("Invalid ML-DSA private key: {}", e))?;

    if ed25519_public.len() != 32 || ed25519_private.len() != 32 {
        return Err("Ed25519 keys must be 32 bytes each".to_string());
    }

    IssuerSigningKeys::from_bytes(
        &ed25519_public,
        &ed25519_private,
        &mldsa_public,
        &mldsa_private,
    ).map_err(|e| format!("Failed to load signing keys: {}", e))
}

fn load_verifying_keys(key_file: &KeyFile) -> Result<IssuerVerifyingKeys, String> {
    let ed25519_public = hex::decode(&key_file.ed25519_public)
        .map_err(|e| format!("Invalid ed25519 public key: {}", e))?;
    let mldsa_public = hex::decode(&key_file.mldsa_public)
        .map_err(|e| format!("Invalid ML-DSA public key: {}", e))?;

    if ed25519_public.len() != 32 {
        return Err("Ed25519 public key must be 32 bytes".to_string());
    }
    let mut ed25519_arr = [0u8; 32];
    ed25519_arr.copy_from_slice(&ed25519_public);

    IssuerVerifyingKeys::from_bytes(&ed25519_arr, &mldsa_public)
        .map_err(|e| format!("Failed to load verifying keys: {}", e))
}

fn load_encryption_key(key_file: &KeyFile) -> Result<EncryptionKey, String> {
    let key_bytes = hex::decode(&key_file.encryption_key)
        .map_err(|e| format!("Invalid encryption key: {}", e))?;

    if key_bytes.len() != 32 {
        return Err("Encryption key must be 32 bytes".to_string());
    }

    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes);
    Ok(EncryptionKey::from_bytes(key_array))
}
