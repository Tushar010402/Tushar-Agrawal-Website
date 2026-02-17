"use client";

import { useState } from "react";

interface CodePreviewProps {
  code: string;
  language: string;
  fileName?: string;
}

// Token types for syntax highlighting
type TokenType = "keyword" | "type" | "string" | "comment" | "function" | "macro" | "normal" | "number" | "operator" | "property";

interface Token {
  type: TokenType;
  value: string;
}

const languageKeywords: Record<string, Set<string>> = {
  rust: new Set(["use", "let", "fn", "pub", "struct", "impl", "const", "mut", "async", "await", "return", "if", "else", "match", "for", "while", "loop", "break", "continue", "in", "as", "ref", "move", "self", "Self", "super", "crate", "mod", "trait", "where", "type", "enum", "unsafe", "extern", "dyn", "static", "true", "false"]),
  typescript: new Set(["import", "from", "export", "default", "const", "let", "var", "function", "async", "await", "return", "if", "else", "switch", "case", "break", "continue", "for", "while", "do", "new", "class", "extends", "implements", "interface", "type", "enum", "namespace", "module", "declare", "abstract", "readonly", "private", "protected", "public", "static", "get", "set", "of", "in", "instanceof", "typeof", "keyof", "as", "is", "this", "super", "try", "catch", "finally", "throw", "yield", "void", "delete", "true", "false", "null", "undefined", "never", "any", "unknown", "string", "number", "boolean", "object", "symbol", "bigint"]),
  javascript: new Set(["import", "from", "export", "default", "const", "let", "var", "function", "async", "await", "return", "if", "else", "switch", "case", "break", "continue", "for", "while", "do", "new", "class", "extends", "of", "in", "instanceof", "typeof", "this", "super", "try", "catch", "finally", "throw", "yield", "void", "delete", "true", "false", "null", "undefined"]),
  python: new Set(["import", "from", "as", "def", "class", "return", "if", "elif", "else", "for", "while", "break", "continue", "pass", "raise", "try", "except", "finally", "with", "as", "yield", "lambda", "and", "or", "not", "is", "in", "True", "False", "None", "self", "global", "nonlocal", "del", "assert", "async", "await"]),
  go: new Set(["package", "import", "func", "return", "if", "else", "switch", "case", "default", "for", "range", "break", "continue", "go", "select", "chan", "defer", "type", "struct", "interface", "map", "var", "const", "true", "false", "nil", "make", "new", "len", "cap", "append", "copy", "delete", "close"]),
  sql: new Set(["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "NOT", "NULL", "DEFAULT", "UNIQUE", "CHECK", "AND", "OR", "IN", "LIKE", "BETWEEN", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AS", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "EXISTS", "DISTINCT", "BOOLEAN", "TEXT", "INTEGER", "VARCHAR", "TIMESTAMP", "SERIAL", "BIGSERIAL", "UUID", "JSONB", "IF", "CASCADE", "CONSTRAINT", "WITH", "TIMEZONE", "NOW", "CURRENT_TIMESTAMP", "select", "from", "where", "insert", "into", "values", "update", "set", "delete", "create", "table", "alter", "drop", "index", "primary", "key", "foreign", "references", "not", "null", "default", "unique", "check", "and", "or", "in", "like", "between", "join", "left", "right", "inner", "outer", "on", "as", "order", "by", "group", "having", "limit", "offset", "union", "all", "exists", "distinct", "boolean", "text", "integer", "varchar", "timestamp", "serial", "bigserial", "uuid", "jsonb", "if", "cascade", "constraint", "with", "timezone", "now", "current_timestamp"]),
  bash: new Set(["if", "then", "else", "elif", "fi", "for", "do", "done", "while", "until", "case", "esac", "in", "function", "return", "export", "local", "readonly", "declare", "unset", "shift", "exit", "echo", "printf", "cd", "ls", "cp", "mv", "rm", "mkdir", "cat", "grep", "sed", "awk", "npm", "yarn", "pnpm", "bun", "npx", "pip", "cargo", "go", "git", "curl", "wget", "sudo", "apt", "brew"]),
  toml: new Set(["true", "false"]),
  json: new Set([]),
};

const languageTypes: Record<string, Set<string>> = {
  rust: new Set(["QShieldKEM", "QShieldKDF", "QShieldSign", "QShieldHandshake", "QShieldMessage", "QuantumShield", "QShieldHybridKEM", "QShieldCipher", "QShieldVerifier", "QShieldSession", "QShieldKeyExchange", "DualSignature", "HybridEncapsulation", "HybridCipherResult", "String", "Vec", "Option", "Result", "Ok", "Err", "Some", "None", "u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64", "f32", "f64", "bool", "usize", "isize", "str"]),
  typescript: new Set(["QAuthServer", "QAuthClient", "QAuthValidator", "ProofValidator", "PolicyEngine", "TokenOptions", "TokenPayload", "QAuthConfig", "IssuerKeys", "Policy", "PolicyRule", "PolicyConditions", "EvaluationContext", "EvaluationResult", "QShieldCipher", "QShieldKeyExchange", "QShieldSession", "QShieldHybridKEM", "QShieldSign", "QShieldVerifier", "NodeCipher", "NodeKeyExchange", "NodeSession", "Promise", "Record", "Partial", "Required", "Readonly", "Pick", "Omit", "Exclude", "Extract", "Map", "Set", "Array", "Uint8Array", "Buffer", "Request", "Response", "NextRequest", "NextResponse", "Headers"]),
  javascript: new Set(["QAuthServer", "QAuthClient", "QAuthValidator", "ProofValidator", "PolicyEngine", "Promise", "Map", "Set", "Array", "Uint8Array", "Buffer", "Request", "Response", "Headers", "Error"]),
  python: new Set(["QAuthServer", "QAuthClient", "PolicyEngine", "QShieldKEM", "QShieldSign", "QuantumShield", "QShieldKDF", "KdfConfig", "DerivedKey", "QShieldKEMPublicKey", "QShieldKEMSecretKey", "QShieldKEMCiphertext", "QShieldSignature", "str", "int", "float", "bool", "list", "dict", "tuple", "set", "bytes", "None"]),
  go: new Set(["Config", "TokenOptions", "Server", "Client", "QShieldCipher", "QShieldKEM", "QShieldSign", "QShieldKDF", "QShieldSession", "string", "int", "int64", "float64", "bool", "error", "byte"]),
  sql: new Set([]),
  bash: new Set([]),
  toml: new Set([]),
  json: new Set([]),
};

function getDefaultFileName(language: string): string {
  const fileNames: Record<string, string> = {
    rust: "main.rs",
    typescript: "index.ts",
    javascript: "index.js",
    python: "main.py",
    go: "main.go",
    sql: "schema.sql",
    bash: "terminal",
    toml: "Cargo.toml",
    json: "config.json",
  };
  return fileNames[language] || language;
}

export function CodePreview({ code, language, fileName }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lang = language.toLowerCase();
  const keywords = languageKeywords[lang] || languageKeywords["typescript"] || new Set();
  const types = languageTypes[lang] || new Set();

  // Tokenize a line of code (simple tokenizer)
  const tokenizeLine = (line: string): Token[] => {
    const tokens: Token[] = [];

    // Determine comment prefix
    const commentPrefixes: Record<string, string> = {
      rust: "//", typescript: "//", javascript: "//", go: "//",
      python: "#", bash: "#", sql: "--", toml: "#", json: "",
    };
    const commentPrefix = commentPrefixes[lang] || "//";

    // Check for comment first
    let commentIndex = -1;
    if (commentPrefix) {
      // Don't match inside strings
      let inString = false;
      let stringChar = "";
      for (let i = 0; i < line.length; i++) {
        if (!inString && (line[i] === '"' || line[i] === "'" || line[i] === '`')) {
          inString = true;
          stringChar = line[i];
        } else if (inString && line[i] === stringChar && line[i - 1] !== '\\') {
          inString = false;
        } else if (!inString && line.slice(i).startsWith(commentPrefix)) {
          commentIndex = i;
          break;
        }
      }
    }

    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

    if (lang === "json") {
      // JSON tokenization
      const jsonRegex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\]:,])|(\s+)/g;
      let match;
      while ((match = jsonRegex.exec(codePart)) !== null) {
        if (match[1]) {
          tokens.push({ type: "property", value: match[1] });
          const rest = match[0].slice(match[1].length);
          if (rest) tokens.push({ type: "normal", value: rest });
        } else if (match[2]) {
          tokens.push({ type: "string", value: match[2] });
        } else if (match[3]) {
          tokens.push({ type: "number", value: match[3] });
        } else if (match[4]) {
          tokens.push({ type: "keyword", value: match[4] });
        } else {
          tokens.push({ type: "normal", value: match[0] });
        }
      }
      return tokens;
    }

    // General tokenization
    const tokenRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$|#.*$|--.*$|\b\d+(?:\.\d+)?\b|\b\w+\b!?|[^\s\w]+|\s+)/g;
    let match;

    while ((match = tokenRegex.exec(codePart)) !== null) {
      const value = match[0];

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('`') && value.endsWith('`'))) {
        tokens.push({ type: "string", value });
      } else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
        tokens.push({ type: "number", value });
      } else if (value.endsWith("!") && /^\w+!$/.test(value)) {
        tokens.push({ type: "macro", value });
      } else if (keywords.has(value)) {
        tokens.push({ type: "keyword", value });
      } else if (types.has(value)) {
        tokens.push({ type: "type", value });
      } else if (/^\w+$/.test(value) && codePart.slice(match.index + value.length).trimStart().startsWith("(")) {
        tokens.push({ type: "function", value });
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
        tokens.push({ type: "type", value });
      } else if (/^[=<>!&|+\-*/%^~?:]+$/.test(value) || value === "=>" || value === "->") {
        tokens.push({ type: "operator", value });
      } else {
        tokens.push({ type: "normal", value });
      }
    }

    // Add comment if present
    if (commentPart) {
      tokens.push({ type: "comment", value: commentPart });
    }

    return tokens;
  };

  // Get CSS class for token type
  const getTokenClass = (type: TokenType): string => {
    switch (type) {
      case "keyword": return "text-purple-400";
      case "type": return "text-yellow-400";
      case "string": return "text-green-400";
      case "comment": return "text-theme-muted";
      case "function": return "text-blue-400";
      case "macro": return "text-orange-400";
      case "number": return "text-orange-300";
      case "operator": return "text-cyan-400";
      case "property": return "text-blue-300";
      default: return "";
    }
  };

  // Render highlighted code
  const renderCode = () => {
    return code.split("\n").map((line, i) => {
      const tokens = tokenizeLine(line);
      return (
        <div key={i} className="flex">
          <span className="text-theme-muted select-none w-6 md:w-8 flex-shrink-0 text-right pr-3 md:pr-4">
            {i + 1}
          </span>
          <span className="flex-1 min-w-0">
            {tokens.map((token, j) => {
              const className = getTokenClass(token.type);
              return className ? (
                <span key={j} className={className}>{token.value}</span>
              ) : (
                <span key={j}>{token.value}</span>
              );
            })}
          </span>
        </div>
      );
    });
  };

  const displayFileName = fileName || getDefaultFileName(lang);

  return (
    <div
      className="rounded-2xl overflow-hidden w-full max-w-full"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        maxWidth: '100%',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3"
        style={{
          background: "var(--surface-hover)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-theme-tertiary text-xs md:text-sm ml-2">{displayFileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-muted font-mono hidden sm:inline">{language}</span>
          <button
            onClick={handleCopy}
            className="text-theme-tertiary hover:text-theme transition-colors p-1"
            title="Copy code"
          >
            {copied ? (
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="p-3 md:p-4 overflow-x-auto overflow-y-hidden text-xs md:text-sm font-mono leading-relaxed text-theme-secondary max-w-full">
        <div className="min-w-0">
          {renderCode()}
        </div>
      </div>
    </div>
  );
}
