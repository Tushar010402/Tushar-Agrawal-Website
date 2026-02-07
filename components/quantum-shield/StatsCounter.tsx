"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function StatsCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/waitlist");
        if (response.ok) {
          const data = await response.json();
          setCount(data.count);
        }
      } catch {
        // Silently fail - counter is optional
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, []);

  // Don't show if count is 0 or loading failed
  if (loading || count === null || count === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-2 text-sm text-theme-secondary"
    >
      <div className="flex -space-x-2">
        {[...Array(Math.min(3, count))].map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "var(--accent)",
              border: "2px solid var(--background)",
            }}
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        ))}
      </div>
      <span>
        Join <span className="text-theme font-semibold">{count}</span>{" "}
        {count === 1 ? "developer" : "developers"} on the waitlist
      </span>
    </motion.div>
  );
}
