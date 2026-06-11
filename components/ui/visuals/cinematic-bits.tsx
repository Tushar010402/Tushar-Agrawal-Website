"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Cinematic micro-interactions. Shared rules:
 *  - no React state on hot paths — pointer/scroll handlers write styles directly
 *  - everything observes prefers-reduced-motion and IntersectionObserver
 *  - compositor-only properties (transform/opacity) wherever possible
 */

/* ---- Focus-pull text -------------------------------------------------- */

/**
 * Words sharpen out of a lens blur when first scrolled into view — a camera
 * focus pull. Renders fully visible until JS mounts, so the text is never
 * lost without JavaScript.
 */
export function FocusText({
  children,
  className = "",
  as: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("ft-ready");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("ft-in");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let idx = 0;
  const wrap = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      return node.split(/(\s+)/).map((part, k) =>
        part.trim() === "" ? (
          part
        ) : (
          <span key={k} className="ft-w" style={{ "--ft-i": idx++ } as CSSProperties}>
            {part}
          </span>
        )
      );
    }
    if (isValidElement(node)) {
      /* Styled fragments (e.g. highlighted names) move as one unit. */
      return (
        <span className="ft-w" style={{ "--ft-i": idx++ } as CSSProperties}>
          {node}
        </span>
      );
    }
    return node;
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`focus-text ${className}`}>
      {Children.map(children, wrap)}
    </Tag>
  );
}

/* ---- Scrub text ---------------------------------------------------------- */

/**
 * Words light up one by one as the paragraph scrolls through the viewport —
 * reading pace tied to scroll position, scrubbing both ways. Text renders
 * fully visible until JS mounts (and stays so under reduced motion).
 */
export function ScrubText({
  children,
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("scrub-ready");
    const spans = Array.from(el.querySelectorAll<HTMLElement>(".scrub-w"));
    let lit = -1;
    let raf = 0;
    let active = false;

    const update = () => {
      raf = 0;
      if (!active) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const span = r.height + vh * 0.45;
      const p = Math.max(0, Math.min(1, (start - r.top) / span));
      const n = Math.round(p * spans.length);
      if (n !== lit) {
        const [from, to] = n > lit ? [lit + 1, n] : [n + 1, lit];
        for (let i = Math.max(0, from); i <= Math.min(spans.length - 1, to); i++) {
          spans[i].classList.toggle("lit", i < n);
        }
        lit = n;
      }
    };
    const kick = () => { if (active && !raf) raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      kick();
    }, { rootMargin: "20% 0px" });
    io.observe(el);
    window.addEventListener("scroll", kick, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const wrap = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      return node.split(/(\s+)/).map((part, k) =>
        part.trim() === "" ? part : <span key={k} className="scrub-w">{part}</span>
      );
    }
    if (isValidElement(node)) {
      return <span className="scrub-w">{node}</span>;
    }
    return node;
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`scrub-text ${className}`}>
      {Children.map(children, wrap)}
    </Tag>
  );
}

/* ---- Card sheen -------------------------------------------------------- */

/**
 * Pointer-tracked light: a soft radial sheen plus a glowing border segment
 * that follows the cursor across a card. Drop it inside any positioned card;
 * it attaches its listeners to the parent element. Hover devices only.
 */
export function CardSheen() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    const move = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - r.left}px`);
      el.style.setProperty("--sy", `${e.clientY - r.top}px`);
    };
    parent.classList.add("has-sheen");
    parent.addEventListener("pointermove", move);
    return () => {
      parent.classList.remove("has-sheen");
      parent.removeEventListener("pointermove", move);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="card-sheen" />;
}

/* ---- 3D tilt ------------------------------------------------------------ */

/**
 * Perspective tilt that follows the pointer — cards become physical objects.
 * Springs back to flat on leave. Hover-capable fine pointers only.
 */
export function Tilt3D({
  children,
  className = "",
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  /** max tilt in degrees */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let rx = 0, ry = 0, tx = 0, ty = 0;
    const update = () => {
      raf = 0;
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      if (Math.abs(tx - rx) > 0.04 || Math.abs(ty - ry) > 0.04) {
        raf = requestAnimationFrame(update);
      } else if (tx === 0 && ty === 0) {
        el.style.transform = "";
      }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tx = -py * max * 2;
      ty = px * max * 2;
      kick();
    };
    const leave = () => { tx = 0; ty = 0; kick(); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}

/* ---- Cursor aura ---------------------------------------------------------- */

/**
 * A soft accent dot + trailing ring that follows the pointer and swells over
 * interactive elements. Accompanies (never replaces) the native cursor.
 * Desktop fine-pointer only; the loop sleeps whenever the cursor settles.
 */
export function CursorAura() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = -100, y = -100, rx = -100, ry = -100;
    let scale = 1, tScale = 1;
    let raf = 0;
    const loop = () => {
      raf = 0;
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      scale += (tScale - scale) * 0.18;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale.toFixed(3)})`;
      if (Math.abs(x - rx) > 0.2 || Math.abs(y - ry) > 0.2 || Math.abs(tScale - scale) > 0.01) {
        raf = requestAnimationFrame(loop);
      }
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      tScale = t?.closest?.("a, button, [role='button'], input, select, textarea") ? 1.9 : 1;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const out = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", out);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", out);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} aria-hidden="true" className="cursor-dot" />
      <div ref={ringRef} aria-hidden="true" className="cursor-ring" />
    </>
  );
}

/* ---- Parallax cover ----------------------------------------------------- */

/**
 * Scroll-linked camera drift for cover imagery: the child is overscaled and
 * translated against scroll direction while the card crosses the viewport.
 * Style writes happen in rAF only while the element is on screen.
 */
export function ParallaxCover({
  children,
  className = "",
  strength = 6,
}: {
  children: ReactNode;
  className?: string;
  /** max translation, in % of the cover height */
  strength?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current;
    const n = inner.current;
    if (!o || !n) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active = false;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!active) return;
      const r = o.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(
        -1,
        Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2))
      );
      n.style.transform = `translate3d(0, ${(-p * strength).toFixed(2)}%, 0) scale(1.14)`;
    };
    const kick = () => {
      if (active && !raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      kick();
    });
    io.observe(o);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={outer} className={`overflow-hidden ${className}`}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}
