"use client";

import { useEffect, useRef, useState } from "react";
import { HeroBlobs } from "./hero-blobs";

/**
 * Live-rendered ridgeline scene: one fullscreen fragment shader draws layered
 * mountain silhouettes, atmospheric fog and light rays between the peaks.
 * No video file, no three.js — ~2 KB of GLSL plus glue.
 *
 * Performance contract:
 *  - renders at a capped DPR (≤1.2 effective) — the scene is low-frequency,
 *    upscaling is invisible
 *  - the rAF loop runs only while the hero is on screen (IntersectionObserver)
 *  - scroll is read in the loop and smoothed there; listeners do no work
 *  - prefers-reduced-motion → a single static frame, no loop
 *  - no WebGL / context lost → falls back to the pure-CSS HeroBlobs
 *  - theme switches are picked up live (palette is derived from CSS variables)
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec3 uSkyA;
uniform vec3 uSkyB;
uniform vec3 uRidgeA;
uniform vec3 uRidgeB;
uniform vec3 uGlow;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
/* Static terrain profile — the mountains never morph; only light and fog move. */
float ridge(float x, float seed) {
  return fbm(vec2(x * 1.4 + seed * 17.3, seed * 7.7)) * 0.72
       + fbm(vec2(x * 4.6 + seed * 31.1, seed * 3.3)) * 0.16;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;

  vec3 sky = mix(uSkyA, uSkyB, pow(1.0 - uv.y, 1.7));

  vec2 sun = vec2(0.70, 0.52);
  vec2 sv = vec2((uv.x - sun.x) * aspect, uv.y - sun.y);
  float d = length(sv);
  sky += uGlow * exp(-d * 4.5) * 0.45;
  sky += uGlow * exp(-d * 1.6) * 0.12;

  /* Light rays: two interfering angular waves rotating around the sun. */
  float ang = atan(sv.y, sv.x);
  float rays = (sin(ang * 13.0 - uTime * 0.30) * 0.5 + 0.5)
             * (sin(ang * 5.0 + uTime * 0.18) * 0.5 + 0.5);
  sky += uGlow * rays * exp(-d * 2.4) * smoothstep(0.04, 0.30, d) * 0.35;

  vec3 col = sky;
  for (int i = 0; i < 4; i++) {
    float depth = float(i) / 3.0; /* 0 = far, 1 = near */
    /* Scroll pans the camera: far layers drift slower than near ones. */
    float x = uv.x * mix(0.9, 1.7, depth) + uScroll * mix(0.06, 0.22, depth);
    float h = mix(0.60, 0.18, depth)
            + (ridge(x, float(i) + 1.0) - 0.5) * mix(0.30, 0.46, depth);
    float m = smoothstep(h + 0.004, h - 0.004, uv.y);
    vec3 rc = mix(uRidgeA, uRidgeB, depth);
    /* Fog rolls slowly through the valleys. */
    float breathe = 0.85 + 0.3 * noise(vec2(uv.x * 2.5 + uTime * 0.05, float(i) * 4.0));
    float fog = mix(0.80, 0.10, depth) * smoothstep(h - 0.30, h + 0.05, uv.y) * breathe;
    rc = mix(rc, sky, clamp(fog, 0.0, 1.0));
    /* Rim light along each crest. */
    rc += uGlow * exp(-abs(uv.y - h) * 70.0) * (0.30 - depth * 0.16);
    col = mix(col, rc, m);
  }

  float vig = smoothstep(1.35, 0.5, length(uv - vec2(0.5, 0.45)));
  col *= mix(0.85, 1.0, vig);
  col += (hash(gl_FragCoord.xy * 0.7) - 0.5) * 0.012; /* dither kills banding */
  gl_FragColor = vec4(col, 1.0);
}
`;

type Vec3 = [number, number, number];

function cssColor(name: string): Vec3 {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    const f = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    if (f.length === 6) {
      return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255) as Vec3;
    }
  }
  const m = raw.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/).map(parseFloat);
    return [r / 255, g / 255, b / 255];
  }
  return [0.06, 0.05, 0.04];
}

const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Two theme variables carry the whole mood: background + accent. */
function palette() {
  const bg = cssColor("--background");
  const accent = cssColor("--accent");
  const glow = cssColor("--accent-hover");
  const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  if (lum < 0.5) {
    return {
      uSkyA: scale3(bg, 0.4),
      uSkyB: mix3(bg, accent, 0.38),
      uRidgeA: mix3(bg, accent, 0.18),
      uRidgeB: scale3(bg, 0.3),
      uGlow: glow,
    };
  }
  return {
    uSkyA: bg,
    uSkyB: mix3(bg, accent, 0.16),
    uRidgeA: mix3(bg, accent, 0.12),
    uRidgeB: scale3(mix3(bg, accent, 0.3), 0.92),
    uGlow: accent,
  };
}

export function AuroraRidge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFailed(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uScroll = u("uScroll");
    const colorUniforms = {
      uSkyA: u("uSkyA"),
      uSkyB: u("uSkyB"),
      uRidgeA: u("uRidgeA"),
      uRidgeB: u("uRidgeB"),
      uGlow: u("uGlow"),
    };

    const applyPalette = () => {
      const p = palette();
      for (const [name, loc] of Object.entries(colorUniforms)) {
        gl.uniform3fv(loc, p[name as keyof typeof p]);
      }
    };
    applyPalette();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let smoothScroll = 0;
    let visible = false;
    let raf = 0;
    let firstFrame = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.8;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (time: number) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uScroll, smoothScroll / Math.max(1, window.innerHeight));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (firstFrame) {
        firstFrame = false;
        setLive(true);
      }
    };

    const loop = () => {
      raf = 0;
      if (!visible) return;
      smoothScroll += (window.scrollY - smoothScroll) * 0.06;
      draw((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    const drawStatic = () => {
      smoothScroll = window.scrollY;
      draw(40); /* a fixed time where the rays sit nicely */
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) return;
      if (reduce) drawStatic();
      else if (!raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      if (reduce && visible) drawStatic();
    });
    ro.observe(canvas);

    const themeWatcher = new MutationObserver(() => {
      applyPalette();
      if (reduce && visible) drawStatic();
    });
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      io.disconnect();
      ro.disconnect();
      themeWatcher.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      if (raf) cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (failed) {
    return (
      <div className="aurora-ridge">
        <div style={{ opacity: 0.5, position: "absolute", inset: 0 }}>
          <HeroBlobs />
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-ridge" aria-hidden="true">
      {/* Blobs paint first so there is never a blank hero; the canvas fades over them. */}
      {!live && (
        <div style={{ opacity: 0.5, position: "absolute", inset: 0 }}>
          <HeroBlobs />
        </div>
      )}
      <canvas ref={canvasRef} className={live ? "is-live" : undefined} />
    </div>
  );
}
