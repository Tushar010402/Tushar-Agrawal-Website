"use client";

import { useState } from "react";

interface CodePreviewProps {
  code: string;
  language: string;
}

// Token types for syntax highlighting
type TokenType = "keyword" | "type" | "string" | "comment" | "function" | "macro" | "normal";

interface Token {
  type: TokenType;
  value: string;
}

export function CodePreview({ code, language }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tokenize a line of code (simple tokenizer)
  const tokenizeLine = (line: string): Token[] => {
    const tokens: Token[] = [];

    // Check for comment first
    const commentIndex = line.indexOf("//");
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

    // Simple word-by-word tokenization for the code part
    let remaining = codePart;
    const keywords = new Set(["use", "let", "fn", "pub", "struct", "impl", "const", "mut", "async", "await", "return", "if", "else", "match", "for", "while", "loop", "break", "continue", "in", "as", "ref", "move", "self", "Self", "super", "crate", "mod", "trait", "where", "type", "enum", "unsafe", "extern", "dyn", "static", "true", "false"]);
    const types = new Set(["QShieldKEM", "QuantumShield", "String", "Vec", "Option", "Result", "Ok", "Err", "Some", "None"]);

    // Match tokens using a simple pattern
    const tokenRegex = /(".*?"|\/\/.*$|\b\w+\b!?|[^\s\w]+|\s+)/g;
    let match;

    while ((match = tokenRegex.exec(remaining)) !== null) {
      const value = match[0];

      if (value.startsWith('"') && value.endsWith('"')) {
        tokens.push({ type: "string", value });
      } else if (value.endsWith("!") && /^\w+!$/.test(value)) {
        tokens.push({ type: "macro", value });
      } else if (keywords.has(value)) {
        tokens.push({ type: "keyword", value });
      } else if (types.has(value)) {
        tokens.push({ type: "type", value });
      } else if (/^\w+$/.test(value) && remaining.slice(match.index + value.length).trimStart().startsWith("(")) {
        tokens.push({ type: "function", value });
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
      case "comment": return "text-neutral-500";
      case "function": return "text-blue-400";
      case "macro": return "text-orange-400";
      default: return "";
    }
  };

  // Render highlighted code
  const renderCode = () => {
    return code.split("\n").map((line, i) => {
      const tokens = tokenizeLine(line);
      return (
        <div key={i} className="flex">
          <span className="text-neutral-600 select-none w-6 md:w-8 flex-shrink-0 text-right pr-3 md:pr-4">
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

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-neutral-800/50 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-neutral-500 text-xs md:text-sm ml-2">main.rs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600 font-mono hidden sm:inline">{language}</span>
          <button
            onClick={handleCopy}
            className="text-neutral-500 hover:text-white transition-colors p-1"
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
      <div className="p-3 md:p-4 overflow-x-auto text-xs md:text-sm font-mono leading-relaxed text-neutral-300">
        {renderCode()}
      </div>
    </div>
  );
}
