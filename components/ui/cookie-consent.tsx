"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie-consent";

type Choice = "accepted" | "rejected";

function persist(choice: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {}
  // Also drop a first-party cookie so the choice is readable server-side.
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${STORAGE_KEY}=${choice}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (stored !== "accepted" && stored !== "rejected") {
      // Defer a tick so it animates in after paint (and never blocks LCP).
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (choice: Choice) => {
    persist(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[1000] md:max-w-md"
    >
      <div
        className="rounded-2xl p-5 md:p-6 shadow-lg"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 grid place-items-center w-9 h-9 rounded-full"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
          >
            <Cookie className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Cookies
            </h2>
            <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--text-secondary)" }}>
              This site uses essential cookies to run, plus optional analytics to understand traffic
              and improve the experience. You can accept or decline the optional ones.{" "}
              <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>
                Learn more
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => decide("accepted")}
            className="clay-btn clay-btn-dark flex-1 justify-center !py-2.5 text-sm"
          >
            Accept all
          </button>
          <button
            onClick={() => decide("rejected")}
            className="clay-btn clay-btn-ghost flex-1 justify-center !py-2.5 text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
