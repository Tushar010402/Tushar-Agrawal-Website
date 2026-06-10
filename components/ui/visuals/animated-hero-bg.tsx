"use client";

import { useEffect, useRef } from "react";

/**
 * Looping, video-style hero backdrop. Soft color "blobs" drift on a canvas — a
 * living gradient mesh that reads like an ambient video loop, but is cheap:
 *
 * Performance:
 * - The backing buffer renders at ~0.5x CSS size (the result is blurry anyway),
 *   cutting fill cost by ~75%. CSS scales it back up.
 * - DPR is pinned to 1 (no retina multiplier needed for a blurred gradient).
 * - Capped at 24fps: the blobs drift over ~35s, so 60fps is pure waste — and the
 *   CSS blur re-runs on the GPU every painted frame, so fewer frames = less blur.
 * - On mobile / low-core / reduced-motion devices it paints ONE static frame
 *   and never starts a RAF loop.
 * - Pauses when scrolled out of view.
 */
export function AnimatedHeroBg({
  className = "",
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const css = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const palette = [
      css("--accent", "#e0a526"),
      "#f3bd4c",
      "#b45309",
      css("--accent-hover", "#f3bd4c"),
    ].filter(Boolean);

    const RENDER_SCALE = 0.5; // low-res backing buffer; it's blurred anyway
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width * RENDER_SCALE));
      h = Math.max(1, Math.floor(rect.height * RENDER_SCALE));
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const blobs = Array.from({ length: 4 }, (_, i) => ({
      x: (0.2 + 0.6 * ((i * 0.37) % 1)) * w,
      y: (0.2 + 0.6 * ((i * 0.53) % 1)) * h,
      r: Math.min(w, h) * (0.5 + (i % 3) * 0.14),
      hueShift: i,
      sx: 0.6 + (i % 4) * 0.18,
      sy: 0.5 + ((i + 2) % 4) * 0.16,
      px: i * 1.7,
      py: i * 2.3,
      color: palette[i % palette.length],
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const cx = b.x + Math.sin(t * 0.00018 * b.sx + b.px) * w * 0.18;
        const cy = b.y + Math.cos(t * 0.00016 * b.sy + b.py) * h * 0.22;
        const pulse = 1 + Math.sin(t * 0.0004 + b.hueShift) * 0.08;
        const r = b.r * pulse;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, hexToRgba(b.color, 0.5 * intensity));
        g.addColorStop(0.5, hexToRgba(b.color, 0.16 * intensity));
        g.addColorStop(1, hexToRgba(b.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    // Decide whether to animate at all.
    const still = new URLSearchParams(window.location.search).has("still");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowCore = (navigator.hardwareConcurrency || 8) <= 4;
    const staticOnly = still || reduce || coarse || lowCore;

    let raf = 0;
    let running = false;
    const FRAME_MS = 1000 / 24; // 24fps is indistinguishable for slow ambient drift
    let lastFrame = 0;
    const loop = (t: number) => {
      if (!running) return;
      if (t - lastFrame >= FRAME_MS) {
        lastFrame = t;
        draw(t);
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || staticOnly) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (staticOnly) {
      draw(1200); // single representative frame
    } else {
      start();
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (staticOnly) return;
        if (entries[0]?.isIntersecting) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (staticOnly) draw(1200);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      io.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      // 4px (was 8): the gradients are already smooth — blur only hides upscaling
      // artifacts, and GPU blur cost grows fast with radius on a full-viewport layer.
      style={{ width: "100%", height: "100%", filter: "blur(4px)" }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3,8}$/.test(c)) return `rgba(224,165,38,${alpha})`;
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const n = parseInt(c.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
