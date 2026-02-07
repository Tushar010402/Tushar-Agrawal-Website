"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const CHARS = "!@#$%&*_+-=?/|<>";

export function TextScramble({
  text,
  className,
  duration = 2000,
  delay = 0,
}: {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const [displayText, setDisplayText] = useState(text);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const scramble = useCallback(() => {
    const chars = text.length;
    const msPerChar = duration / chars;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const resolved = Math.min(Math.floor(elapsed / msPerChar), chars);

      let result = "";
      for (let i = 0; i < chars; i++) {
        if (i < resolved) {
          result += text[i];
        } else if (text[i] === " ") {
          result += " ";
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      setDisplayText(result);

      if (resolved < chars) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayText(text);
        setDone(true);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [text, duration]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
      scramble();
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [delay, scramble]);

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <div className="text-theme-secondary text-2xl leading-snug tracking-wide">
          <span style={{ opacity: started ? 1 : 0 }}>{displayText}</span>
          {started && !done && (
            <span
              className="inline-block w-[2px] h-[1em] align-middle ml-[2px] animate-pulse"
              style={{ background: "var(--accent)" }}
            />
          )}
          {/* Invisible placeholder to reserve space before start */}
          {!started && (
            <span className="invisible" aria-hidden="true">{text}</span>
          )}
        </div>
      </div>
    </div>
  );
}
