"use client";

import { useState } from "react";

interface CodePreviewProps {
  code: string;
  language: string;
}

export function CodePreview({ code, language }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for Rust
  const highlightCode = (code: string) => {
    return code
      .split("\n")
      .map((line, i) => {
        // First, handle comments separately to avoid highlighting inside them
        const commentMatch = line.match(/^(.*?)(\/\/.*)$/);
        let codePart = commentMatch ? commentMatch[1] : line;
        const commentPart = commentMatch ? commentMatch[2] : "";

        let highlighted = codePart
          // Strings
          .replace(
            /(".*?")/g,
            '<span class="text-green-400">$1</span>'
          )
          // Keywords
          .replace(
            /\b(use|let|fn|pub|struct|impl|const|mut|async|await|return|if|else|match|for|while|loop|break|continue|in|as|ref|move|self|Self|super|crate|mod|trait|where|type|enum|unsafe|extern|dyn|static|true|false)\b/g,
            '<span class="text-purple-400">$1</span>'
          )
          // Types
          .replace(
            /\b(QShieldKEM|QuantumShield|String|Vec|Option|Result|Ok|Err|Some|None|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str)\b/g,
            '<span class="text-yellow-400">$1</span>'
          )
          // Functions/Methods - be more specific to avoid matching inside spans
          .replace(
            /\b(\w+)\(/g,
            '<span class="text-blue-400">$1</span>('
          )
          // Macros
          .replace(
            /\b(\w+)!/g,
            '<span class="text-orange-400">$1!</span>'
          );

        // Add comment with its own styling
        if (commentPart) {
          highlighted += `<span class="text-neutral-500">${commentPart}</span>`;
        }

        return `<span class="text-neutral-600 select-none mr-4">${String(i + 1).padStart(2, " ")}</span>${highlighted}`;
      })
      .join("\n");
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/50 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-neutral-500 text-sm ml-2">main.rs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600 font-mono">{language}</span>
          <button
            onClick={handleCopy}
            className="text-neutral-500 hover:text-white transition-colors p-1"
            title="Copy code"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <pre className="p-3 md:p-4 overflow-x-auto text-xs md:text-sm font-mono leading-relaxed scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        <code
          dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          className="text-neutral-300 whitespace-pre"
        />
      </pre>
    </div>
  );
}
