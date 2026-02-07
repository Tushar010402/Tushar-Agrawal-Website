"use client";
import { useEffect, useRef, useCallback } from "react";

export type EntityType = "qubit" | "neuron" | "circuit" | "code" | "hexnode";

export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  type: EntityType;
  label: string;
  description: string;
  phase: number;
  wanderAngle: number;
  isHovered: boolean;
  isClicked: number;
}

export interface HoveredEntity {
  x: number;
  y: number;
  label: string;
  description: string;
  type: EntityType;
}

const ENTITY_DEFS: { type: EntityType; labels: { label: string; description: string }[] }[] = [
  { type: "qubit", labels: [
    { label: "Quantum Computing", description: "Harnessing quantum mechanics for exponential speedups in computation" },
    { label: "Qubits", description: "The fundamental unit of quantum information, existing in superposition" },
    { label: "Quantum Cryptography", description: "Unbreakable encryption using quantum key distribution" },
  ]},
  { type: "neuron", labels: [
    { label: "AI / ML", description: "Building intelligent systems that learn from data and experience" },
    { label: "Neural Networks", description: "Interconnected layers of nodes mimicking biological brain architecture" },
    { label: "Deep Learning", description: "Multi-layer networks discovering hierarchical data representations" },
    { label: "LLMs", description: "Large language models powering next-gen AI applications" },
  ]},
  { type: "circuit", labels: [
    { label: "Microservices", description: "Decomposing applications into small, independently deployable services" },
    { label: "Distributed Systems", description: "Coordinating multiple machines to work as a unified system" },
    { label: "Event-Driven", description: "Architecture where services communicate through asynchronous events" },
  ]},
  { type: "code", labels: [
    { label: "Python", description: "Versatile language powering backends, AI, and data pipelines" },
    { label: "Go", description: "High-performance systems language built for concurrency" },
    { label: "TypeScript", description: "Type-safe JavaScript for scalable web applications" },
    { label: "PostgreSQL", description: "Advanced open-source relational database with extensibility" },
  ]},
  { type: "hexnode", labels: [
    { label: "Docker", description: "Containerizing applications for consistent deployment anywhere" },
    { label: "Kubernetes", description: "Orchestrating containerized workloads at scale" },
    { label: "Redis", description: "In-memory data store for caching and real-time applications" },
    { label: "Kafka", description: "Distributed event streaming platform for high-throughput data" },
  ]},
];

const CODE_SNIPPETS = ["async fn()", "go func()", "SELECT *", "import ai", "docker run", "kubectl"];
const DEPTH_LAYERS = [0.3, 0.6, 1.0];
const DESKTOP_COUNTS: Record<EntityType, number> = { qubit: 6, neuron: 7, circuit: 6, code: 5, hexnode: 6 };
const MOBILE_COUNTS: Record<EntityType, number> = { qubit: 2, neuron: 3, circuit: 2, code: 2, hexnode: 2 };

function parseColor(css: string): { r: number; g: number; b: number } {
  const hex = css.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex))
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  const m = css.match(/\d+/g);
  if (m && m.length >= 3) return { r: +m[0], g: +m[1], b: +m[2] };
  return { r: 99, g: 102, b: 241 };
}

// ── ZERO-shadowBlur draw functions (use radial gradient for glow on hover only) ──

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: { r: number; g: number; b: number }, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${a})`);
  g.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawQubit(ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }, t: number) {
  const s = 14 * e.z;
  const a = e.isHovered ? 1 : e.z === 0.3 ? 0.3 : e.z === 0.6 ? 0.6 : 0.85;

  if (e.isHovered) drawGlow(ctx, e.x, e.y, s * 2.5, c, 0.15);

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate((t + e.phase) * 0.02);
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  ctx.lineWidth = 1.5 * e.z;
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.9, s * 0.5, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.5})`;
  ctx.lineWidth = e.z;
  ctx.stroke();
  const ang = (t + e.phase) * 0.05;
  ctx.beginPath();
  ctx.arc(Math.cos(ang) * s * 0.9, Math.sin(ang) * s * 0.5, 2 * e.z, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  ctx.fill();
  ctx.restore();
}

function drawNeuron(ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }, t: number) {
  const s = 8 * e.z;
  const a = e.isHovered ? 1 : e.z === 0.3 ? 0.3 : e.z === 0.6 ? 0.6 : 0.85;

  if (e.isHovered) drawGlow(ctx, e.x, e.y, s * 3, c, 0.15);

  const pulse = 1 + Math.sin((t + e.phase) * 0.04) * 0.12;
  ctx.beginPath();
  ctx.arc(e.x, e.y, s * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.35})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  ctx.lineWidth = 1.5 * e.z;
  ctx.stroke();

  const branches = 4;
  for (let i = 0; i < branches; i++) {
    const ang = (Math.PI * 2 * i) / branches + e.phase;
    const ex = e.x + Math.cos(ang) * s * 2.2;
    const ey = e.y + Math.sin(ang) * s * 2.2;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(ang) * s, e.y + Math.sin(ang) * s);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.3})`;
    ctx.lineWidth = e.z;
    ctx.stroke();
    const dp = ((Math.sin((t + e.phase + i * 50) * 0.03) + 1) / 2);
    const sx = e.x + Math.cos(ang) * s;
    const sy = e.y + Math.sin(ang) * s;
    ctx.beginPath();
    ctx.arc(sx + (ex - sx) * dp, sy + (ey - sy) * dp, 1.5 * e.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
    ctx.fill();
  }
}

function drawCircuit(ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }, t: number) {
  const s = 18 * e.z;
  const a = e.isHovered ? 1 : e.z === 0.3 ? 0.3 : e.z === 0.6 ? 0.6 : 0.85;

  if (e.isHovered) drawGlow(ctx, e.x, e.y, s * 1.8, c, 0.12);

  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.5})`;
  ctx.lineWidth = 1.2 * e.z;
  ctx.beginPath();
  ctx.moveTo(e.x - s, e.y);
  ctx.lineTo(e.x - s * 0.3, e.y);
  ctx.lineTo(e.x - s * 0.3, e.y - s * 0.6);
  ctx.lineTo(e.x + s * 0.3, e.y - s * 0.6);
  ctx.lineTo(e.x + s * 0.3, e.y);
  ctx.lineTo(e.x + s, e.y);
  ctx.stroke();

  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  const jx = [e.x - s * 0.3, e.x + s * 0.3, e.x - s * 0.3, e.x + s * 0.3];
  const jy = [e.y, e.y, e.y - s * 0.6, e.y - s * 0.6];
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(jx[i], jy[i], 1.8 * e.z, 0, Math.PI * 2);
    ctx.fill();
  }

  const fp = ((t + e.phase) * 0.03) % 1;
  ctx.beginPath();
  ctx.arc(e.x - s + fp * s * 2, e.y, 2.5 * e.z, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.9})`;
  ctx.fill();
}

function drawCode(ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }) {
  const a = e.isHovered ? 1 : e.z === 0.3 ? 0.3 : e.z === 0.6 ? 0.6 : 0.85;
  const snippet = CODE_SNIPPETS[Math.floor(e.phase) % CODE_SNIPPETS.length];
  const fs = Math.max(9, 12 * e.z);

  ctx.font = `${fs}px monospace`;
  const w = ctx.measureText(snippet).width + 10 * e.z;
  const h = fs + 8 * e.z;

  if (e.isHovered) drawGlow(ctx, e.x, e.y, w, c, 0.1);

  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.1})`;
  ctx.beginPath();
  ctx.roundRect(e.x - w / 2, e.y - h / 2, w, h, 3 * e.z);
  ctx.fill();
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.3})`;
  ctx.lineWidth = e.z;
  ctx.stroke();
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(snippet, e.x, e.y);
}

function drawHexNode(ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }, t: number) {
  const s = 12 * e.z;
  const a = e.isHovered ? 1 : e.z === 0.3 ? 0.3 : e.z === 0.6 ? 0.6 : 0.85;

  if (e.isHovered) drawGlow(ctx, e.x, e.y, s * 2.5, c, 0.15);

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    const px = e.x + Math.cos(ang) * s;
    const py = e.y + Math.sin(ang) * s;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.06})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
  ctx.lineWidth = 1.5 * e.z;
  ctx.stroke();

  const rot = (t + e.phase) * 0.01;
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.25})`;
  ctx.lineWidth = e.z;
  for (let i = 0; i < 3; i++) {
    const a1 = rot + (Math.PI / 3) * (i * 2) - Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(a1) * s * 0.55, e.y + Math.sin(a1) * s * 0.55);
    ctx.lineTo(e.x + Math.cos(a1 + Math.PI) * s * 0.55, e.y + Math.sin(a1 + Math.PI) * s * 0.55);
    ctx.stroke();
  }
}

type DrawFn = (ctx: CanvasRenderingContext2D, e: Entity, c: { r: number; g: number; b: number }, t: number) => void;
const DRAW_FNS: Record<EntityType, DrawFn> = { qubit: drawQubit, neuron: drawNeuron, circuit: drawCircuit, code: drawCode as DrawFn, hexnode: drawHexNode };

// ── Hook ──────────────────────────────────────────────────────
export function useEntitySystem(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onEntityHover: (entity: HoveredEntity | null) => void,
  onEntityClick: (entity: HoveredEntity | null) => void,
) {
  const entitiesRef = useRef<Entity[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number | undefined>(undefined);
  const frameRef = useRef(0);
  const clickBurstRef = useRef(0);
  const clickPosRef = useRef({ x: 0, y: 0 });
  const colorsRef = useRef<{ r: number; g: number; b: number }[]>([]);
  const isMobileRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 }); // cached dimensions
  const onHoverRef = useRef(onEntityHover);
  const onClickRef = useRef(onEntityClick);
  const lastHoveredLabelRef = useRef<string | null>(null);
  onHoverRef.current = onEntityHover;
  onClickRef.current = onEntityClick;

  const getThemeColors = useCallback(() => {
    const s = getComputedStyle(document.documentElement);
    colorsRef.current = [
      parseColor(s.getPropertyValue("--accent").trim() || "#6366f1"),
      parseColor(s.getPropertyValue("--orb-secondary").trim() || "rgba(168,85,247,0.3)"),
      parseColor(s.getPropertyValue("--orb-accent").trim() || "rgba(59,130,246,0.3)"),
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    isMobileRef.current = !window.matchMedia("(hover: hover)").matches;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const counts = isMobileRef.current ? MOBILE_COUNTS : DESKTOP_COUNTS;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height };
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    getThemeColors();

    const observer = new MutationObserver(() => getThemeColors());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Initialize — pre-sorted by z so we never sort at runtime
    const { w, h } = sizeRef.current;
    const entities: Entity[] = [];
    for (const def of ENTITY_DEFS) {
      const count = counts[def.type];
      for (let i = 0; i < count; i++) {
        const labelDef = def.labels[i % def.labels.length];
        const z = DEPTH_LAYERS[i % 3];
        const speed = z === 0.3 ? 0.4 : z === 0.6 ? 0.6 : 0.8;
        entities.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
          z, type: def.type, label: labelDef.label, description: labelDef.description,
          phase: Math.random() * 1000, wanderAngle: Math.random() * Math.PI * 2,
          isHovered: false, isClicked: 0,
        });
      }
    }
    // Sort once by z — order never changes
    entities.sort((a, b) => a.z - b.z);
    entitiesRef.current = entities;

    // Events
    const handleMouseMove = (ev: MouseEvent) => {
      if (isMobileRef.current) return;
      const r = container.getBoundingClientRect();
      mouseRef.current = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
      lastHoveredLabelRef.current = null;
      onHoverRef.current(null);
    };
    const handleClick = (ev: MouseEvent) => {
      const r = container.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      clickPosRef.current = { x: mx, y: my };
      clickBurstRef.current = 30;
      let closest: Entity | null = null, best = 40;
      for (const ent of entitiesRef.current) {
        const d = Math.hypot(ent.x - mx, ent.y - my);
        if (d < best) { best = d; closest = ent; }
      }
      if (closest) {
        closest.isClicked = 120;
        onClickRef.current({ x: closest.x, y: closest.y, label: closest.label, description: closest.description, type: closest.type });
      } else { onClickRef.current(null); }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("click", handleClick);

    if (prefersReduced) {
      const colors = colorsRef.current;
      ctx.clearRect(0, 0, w, h);
      entities.forEach((e) => DRAW_FNS[e.type](ctx, e, colors[Math.floor(e.phase) % 3] || colors[0], 0));
      return () => {
        window.removeEventListener("resize", resizeCanvas);
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("click", handleClick);
        observer.disconnect();
      };
    }

    const MOUSE_R = 200;

    const animate = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const colors = colorsRef.current;
      const ents = entitiesRef.current;
      const mouse = mouseRef.current;
      const burst = clickBurstRef.current;
      const clickPos = clickPosRef.current;
      const t = frameRef.current++;
      if (burst > 0) clickBurstRef.current--;

      // Hover detect
      if (!isMobileRef.current) {
        let hov: Entity | null = null, hd = 35;
        for (let i = 0; i < ents.length; i++) {
          ents[i].isHovered = false;
          const d = Math.hypot(ents[i].x - mouse.x, ents[i].y - mouse.y);
          if (d < hd) { hd = d; hov = ents[i]; }
        }
        if (hov) {
          hov.isHovered = true;
          if (lastHoveredLabelRef.current !== hov.label) {
            lastHoveredLabelRef.current = hov.label;
            onHoverRef.current({ x: hov.x, y: hov.y, label: hov.label, description: hov.description, type: hov.type });
          }
        } else if (lastHoveredLabelRef.current !== null) {
          lastHoveredLabelRef.current = null;
          onHoverRef.current(null);
        }
      }

      // Connection lines — only mid+near layers, same type
      for (let i = 0; i < ents.length; i++) {
        const a = ents[i];
        if (a.z < 0.5) continue; // skip far layer
        for (let j = i + 1; j < ents.length; j++) {
          const b = ents[j];
          if (b.type !== a.type || b.z !== a.z) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 120) continue;
          const c = colors[Math.floor(a.phase) % 3] || colors[0];
          const la = (1 - d / 120) * 0.15 * a.z;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${la})`;
          ctx.lineWidth = 1.2 * a.z;
          ctx.stroke();
        }
      }

      // Find the frozen entity (hovered or clicked) for repulsion
      let frozenEnt: Entity | null = null;
      for (let i = 0; i < ents.length; i++) {
        if (ents[i].isHovered || ents[i].isClicked > 0) { frozenEnt = ents[i]; break; }
      }

      // Physics + draw
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i];
        const frozen = e.isHovered || e.isClicked > 0;

        if (!frozen) {
          // Wander
          e.wanderAngle += (Math.random() - 0.5) * 0.3;
          const drift = e.z === 0.3 ? 0.008 : e.z === 0.6 ? 0.014 : 0.02;
          e.vx += Math.cos(e.wanderAngle) * drift;
          e.vy += Math.sin(e.wanderAngle) * drift;

          // Burst
          if (burst > 0) {
            const cd = Math.hypot(e.x - clickPos.x, e.y - clickPos.y);
            if (cd < MOUSE_R && cd > 0) {
              const f = (MOUSE_R - cd) / MOUSE_R;
              e.vx += ((e.x - clickPos.x) / cd) * f * 3;
              e.vy += ((e.y - clickPos.y) / cd) * f * 3;
            }
          }

          // Mouse attraction
          if (!isMobileRef.current) {
            const md = Math.hypot(mouse.x - e.x, mouse.y - e.y);
            if (md < MOUSE_R && md > 0) {
              const f = (MOUSE_R - md) / MOUSE_R;
              e.vx += ((mouse.x - e.x) / md) * f * 0.04 * e.z;
              e.vy += ((mouse.y - e.y) / md) * f * 0.04 * e.z;
            }
          }

          // Repulsion from frozen (hovered/clicked) entity — keep others away
          if (frozenEnt) {
            const rd = Math.hypot(e.x - frozenEnt.x, e.y - frozenEnt.y);
            const REPULSE_R = 60;
            if (rd < REPULSE_R && rd > 0) {
              const rf = ((REPULSE_R - rd) / REPULSE_R) * 0.35;
              e.vx += ((e.x - frozenEnt.x) / rd) * rf;
              e.vy += ((e.y - frozenEnt.y) / rd) * rf;
            }
          }

          // Speed cap
          const maxS = e.z === 0.3 ? 0.6 : e.z === 0.6 ? 1.0 : 1.4;
          const sp = Math.hypot(e.vx, e.vy);
          if (sp > maxS) { e.vx = (e.vx / sp) * maxS; e.vy = (e.vy / sp) * maxS; }

          e.vx *= 0.995;
          e.vy *= 0.995;
          e.x += e.vx;
          e.y += e.vy;

          if (e.x < 0 || e.x > w) { e.vx *= -1; e.x = Math.max(0, Math.min(w, e.x)); }
          if (e.y < 0 || e.y > h) { e.vy *= -1; e.y = Math.max(0, Math.min(h, e.y)); }
        } else {
          e.vx = 0;
          e.vy = 0;
        }

        if (e.isClicked > 0) e.isClicked--;
        const c = colors[Math.floor(e.phase) % 3] || colors[0];
        DRAW_FNS[e.type](ctx, e, c, t);
      }

      // Mouse lines — only near entities
      if (!isMobileRef.current && mouse.x > -500) {
        for (let i = 0; i < ents.length; i++) {
          const e = ents[i];
          if (e.z < 0.5) continue;
          const d = Math.hypot(mouse.x - e.x, mouse.y - e.y);
          if (d < MOUSE_R * 0.7) {
            const c = colors[Math.floor(e.phase) % 3] || colors[0];
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${(1 - d / (MOUSE_R * 0.7)) * 0.2 * e.z})`;
            ctx.lineWidth = e.z;
            ctx.stroke();
          }
        }
        // Cursor glow
        const c = colors[0] || { r: 99, g: 102, b: 241 };
        drawGlow(ctx, mouse.x, mouse.y, 60, c, 0.1);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("click", handleClick);
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, containerRef, getThemeColors]);
}
