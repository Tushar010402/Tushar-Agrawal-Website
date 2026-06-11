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
