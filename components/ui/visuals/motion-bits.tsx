"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";

/** Count up to a number when scrolled into view (native IntersectionObserver — Lenis-safe). */
export function Counter({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduce) {
        setDisplay(value);
        return;
      }
      const duration = 1400;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setDisplay(value * ease(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.3 }
    );
    io.observe(el);
    // Fallback: if it never intersects (edge cases), reveal after a short delay.
    const fallback = setTimeout(run, 1200);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, [value]);

  const text = value % 1 === 0 ? String(Math.round(display)) : display.toFixed(1);
  return (
    <span ref={ref} className={className}>
      {text}
      {suffix}
    </span>
  );
}

/** Seamless horizontal marquee. Renders the children twice for a loop. */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Pause the CSS animation when scrolled out of view — no reason to composite
  // a moving layer nobody can see.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const track = el.querySelector<HTMLElement>(".marquee-track");
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => {
      track.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`marquee-mask overflow-hidden ${className ?? ""}`}>
      <div className="marquee-track">
        <span className="flex items-center">{children}</span>
        <span className="flex items-center" aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}

/** A word that rolls vertically through a list (kinetic headline accent). */
export function RotatingWord({ words, className, interval = 2200 }: { words: string[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Only rotate while on screen — no ticking (and re-rendering) once the hero scrolls away.
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id === null) id = setInterval(() => setI((p) => (p + 1) % words.length), interval);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [words.length, interval]);

  return (
    <span ref={rootRef} className={`relative inline-grid overflow-hidden align-bottom ${className ?? ""}`} style={{ verticalAlign: "bottom" }}>
      {/* reserve width with the longest word, invisible */}
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
        {words.reduce((a, b) => (a.length >= b.length ? a : b))}
      </span>
      <span className="col-start-1 row-start-1 inline-block">
        <motion.span
          key={i}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {words[i]}
        </motion.span>
      </span>
    </span>
  );
}
