"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TOPIC_CHIPS = [
  "Quantum Computing",
  "AI & ML",
  "Microservices",
  "System Design",
  "Python vs Go",
  "Docker & K8s",
];

function getWelcomeMessage(topic?: string): string {
  if (topic) {
    return `Hi! I'm Tushar's AI Tech Assistant. I see you're interested in **${topic}** — great topic! Ask me anything about it, or I can point you to relevant blog posts.`;
  }
  return "Hi! I'm Tushar's AI Tech Assistant. I can help you explore topics like quantum computing, AI/ML, backend engineering, microservices, and more. What would you like to learn about?";
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: string;
}

export function AIChatPanel({ isOpen, onClose, topic }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false); // true until first chunk arrives
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  const lastTopicRef = useRef<string | undefined>(undefined);

  // Typewriter buffer — accumulate streamed text in a ref, reveal smoothly via interval
  const streamFullRef = useRef("");
  const displayedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize messages on first open, or reset only when topic actually changes
  useEffect(() => {
    if (!isOpen) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastTopicRef.current = topic;
      setMessages([{ role: "assistant", content: getWelcomeMessage(topic) }]);
    } else if (topic && topic !== lastTopicRef.current) {
      lastTopicRef.current = topic;
      setMessages([{ role: "assistant", content: getWelcomeMessage(topic) }]);
      setError(null);
    }
  }, [isOpen, topic]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Start a 30ms interval that reveals buffered text progressively
  const startTypewriter = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const full = streamFullRef.current;
      const shown = displayedRef.current;
      if (shown >= full.length) return;

      // Reveal proportionally — fast catch-up when lots buffered, smooth when trickling
      const remaining = full.length - shown;
      const reveal = Math.max(2, Math.ceil(remaining * 0.4));
      const newShown = Math.min(shown + reveal, full.length);
      displayedRef.current = newShown;

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: full.slice(0, newShown) };
        }
        return updated;
      });
    }, 30);
  }, []);

  // Stop typewriter and optionally flush all remaining text at once
  const stopTypewriter = useCallback((flush: boolean) => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (flush && streamFullRef.current) {
      const full = streamFullRef.current;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: full };
        }
        return updated;
      });
    }
    streamFullRef.current = "";
    displayedRef.current = 0;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: content.trim() };
      // Capture current messages for API call (before adding placeholder)
      const apiMessages = [...messages, userMsg];

      // Add user message + empty assistant placeholder in one update
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);
      setIsWaiting(true);
      setError(null);
      streamFullRef.current = "";
      displayedRef.current = 0;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages.filter((m) => m.content.trim()),
            topic,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let firstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                if (firstChunk) {
                  firstChunk = false;
                  setIsWaiting(false);
                  startTypewriter();
                }
                // Accumulate in buffer — typewriter interval handles display
                streamFullRef.current += parsed.text;
              }
            } catch {
              // skip unparseable
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errMsg = err instanceof Error ? err.message : "Something went wrong";
        setError(errMsg);
        // Remove empty assistant placeholder on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
          return prev;
        });
      } finally {
        stopTypewriter(true);
        setIsStreaming(false);
        setIsWaiting(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, topic, startTypewriter, stopTypewriter]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            role="dialog"
            aria-label="AI Tech Assistant"
            className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-[90vw] flex flex-col"
            style={{
              background: "var(--background)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                >
                  AI
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-theme">AI Tech Assistant</h2>
                  <p className="text-xs text-theme-tertiary">Ask about tech topics</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget.style.background = "var(--surface-hover)"); }}
                onMouseLeave={(e) => { (e.currentTarget.style.background = "transparent"); }}
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg, i) => {
                // Skip rendering empty assistant placeholder (typing dots shown instead)
                if (msg.role === "assistant" && !msg.content) return null;
                return (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={msg.role === "user" ? "chat-message-user" : "chat-message-assistant"}
                      style={{ maxWidth: "85%" }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator — only while waiting for first content chunk */}
              {isWaiting && (
                <div className="flex justify-start">
                  <div className="chat-message-assistant">
                    <div className="flex gap-1.5 py-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                      <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-center py-2">
                  <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Topic chips */}
            {messages.length <= 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-2">
                {TOPIC_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(`Tell me about ${chip}`)}
                    className="topic-chip"
                    disabled={isStreaming}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="px-5 py-4 shrink-0"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about tech topics..."
                  className="chat-input"
                  rows={1}
                  maxLength={1000}
                  style={{
                    resize: "none",
                    minHeight: "40px",
                    maxHeight: "120px",
                  }}
                  disabled={isStreaming}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="p-2.5 rounded-lg transition-all shrink-0"
                  style={{
                    background: input.trim() && !isStreaming ? "var(--accent)" : "var(--surface)",
                    color: input.trim() && !isStreaming ? "#fff" : "var(--text-muted)",
                  }}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
