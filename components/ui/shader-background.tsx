"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight, dependency-free WebGL shader background.
 *
 * Renders a slow flowing aurora / mesh-gradient on a single full-screen quad.
 * "Modern + fast": one fragment shader, a few uniforms, no three.js (~0 added KB
 * beyond this file). Built to never hurt Core Web Vitals:
 *   - prefers-reduced-motion  -> render nothing here (CSS fallback shows through)
 *   - no WebGL support        -> render nothing here (CSS fallback shows through)
 *   - scrolled offscreen      -> pause the RAF loop (IntersectionObserver)
 *   - tab hidden / blurred    -> pause the RAF loop
 *   - device pixel ratio      -> capped at 1.75 to stay cheap on mobile
 *
 * It reads the active theme's --orb-* CSS variables so it recolors with the theme.
 */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Flowing domain-warped gradient. Cheap: a few sin/noise lookups, no loops.
const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;

// cheap hash-free flowing field
float field(vec2 uv, float t) {
  float v = 0.0;
  v += sin(uv.x * 2.0 + t);
  v += sin(uv.y * 2.3 - t * 0.8);
  v += sin((uv.x + uv.y) * 1.7 + t * 0.6);
  v += sin(length(uv - vec2(0.3, -0.2)) * 4.0 - t);
  return v * 0.25;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.12;

  // subtle pointer parallax
  uv += u_pointer * 0.06;

  float f = field(uv, t);
  float g = field(uv * 1.4 + vec2(2.0, -1.0), t * 1.1 + 1.5);

  float m1 = smoothstep(-0.3, 0.6, f);
  float m2 = smoothstep(-0.2, 0.7, g);

  vec3 col = u_bg;
  col = mix(col, u_c1, m1 * 0.9);
  col = mix(col, u_c2, m2 * 0.7);
  col = mix(col, u_c3, m1 * m2 * 0.6);

  // gentle vignette so edges blend into the page background
  float vig = smoothstep(1.25, 0.2, length(uv));
  col = mix(u_bg, col, vig);

  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

// Read a `--var` color (#hex or rgba()) into 0..1 rgb.
function readColor(styles: CSSStyleDeclaration, name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  if (raw.startsWith("#")) {
    const h = raw.slice(1);
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
  }
  const m = raw.match(/[\d.]+/g);
  if (m && m.length >= 3) return [(+m[0]) / 255, (+m[1]) / 255, (+m[2]) / 255];
  return fallback;
}

export default function ShaderBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    setEnabled(true);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u_res = gl.getUniformLocation(prog, "u_res");
    const u_time = gl.getUniformLocation(prog, "u_time");
    const u_pointer = gl.getUniformLocation(prog, "u_pointer");
    const u_c1 = gl.getUniformLocation(prog, "u_c1");
    const u_c2 = gl.getUniformLocation(prog, "u_c2");
    const u_c3 = gl.getUniformLocation(prog, "u_c3");
    const u_bg = gl.getUniformLocation(prog, "u_bg");

    let colors = { c1: [0.39, 0.4, 0.95], c2: [0.66, 0.33, 0.97], c3: [0.23, 0.51, 0.96], bg: [0.04, 0.04, 0.04] } as Record<string, number[]>;
    const refreshColors = () => {
      const s = getComputedStyle(document.documentElement);
      colors = {
        c1: readColor(s, "--orb-primary", [0.39, 0.4, 0.95]),
        c2: readColor(s, "--orb-secondary", [0.66, 0.33, 0.97]),
        c3: readColor(s, "--orb-accent", [0.23, 0.51, 0.96]),
        bg: readColor(s, "--background", [0.04, 0.04, 0.04]),
      };
    };
    refreshColors();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Pause when offscreen or tab hidden — the core CWV guard.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) loop();
    });
    io.observe(canvas);

    // Recolor when the theme class on <html> changes.
    const mo = new MutationObserver(refreshColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let raf = 0;
    const start = performance.now();
    const render = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      resize();
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(u_res, canvas.width, canvas.height);
      gl.uniform1f(u_time, t);
      gl.uniform2f(u_pointer, pointer.x, pointer.y);
      gl.uniform3fv(u_c1, colors.c1);
      gl.uniform3fv(u_c2, colors.c2);
      gl.uniform3fv(u_c3, colors.c3);
      gl.uniform3fv(u_bg, colors.bg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      loop();
    };
    const loop = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(render);
    };

    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : loop());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", resize);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", opacity: enabled ? 1 : 0, transition: "opacity 0.8s ease" }}
    />
  );
}
