"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface Shape {
  id: number;
  type: "circle" | "square" | "triangle" | "ring";
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function FloatingShapes({
  count = 12,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const types: Shape["type"][] = ["circle", "square", "triangle", "ring"];
    const newShapes: Shape[] = [];

    for (let i = 0; i < count; i++) {
      newShapes.push({
        id: i,
        type: types[Math.floor(Math.random() * types.length)],
        size: Math.random() * 60 + 20,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 15,
        opacity: Math.random() * 0.15 + 0.05,
      });
    }
    setShapes(newShapes);
  }, [count]);

  if (!mounted) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {shapes.map((shape) => (
        <FloatingShape key={shape.id} shape={shape} />
      ))}
    </div>
  );
}

function FloatingShape({ shape }: { shape: Shape }) {
  const floatAnimation = {
    y: [0, -30, 0, 30, 0],
    x: [0, 20, 0, -20, 0],
    rotate: [0, 90, 180, 270, 360],
  };

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        width: shape.size,
        height: shape.size,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: shape.opacity,
        scale: 1,
        ...floatAnimation,
      }}
      transition={{
        opacity: { duration: 1, delay: shape.delay },
        scale: { duration: 1, delay: shape.delay },
        y: { duration: shape.duration, repeat: Infinity, ease: "easeInOut" },
        x: { duration: shape.duration * 1.3, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: shape.duration * 2, repeat: Infinity, ease: "linear" },
      }}
    >
      <ShapeRenderer type={shape.type} />
    </motion.div>
  );
}

function ShapeRenderer({ type }: { type: Shape["type"] }) {
  switch (type) {
    case "circle":
      return (
        <div
          className="w-full h-full rounded-full"
          style={{
            border: "2px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            background: "color-mix(in srgb, var(--accent) 5%, transparent)",
          }}
        />
      );
    case "square":
      return (
        <div
          className="w-full h-full rounded-lg"
          style={{
            border: "2px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            background: "color-mix(in srgb, var(--accent) 5%, transparent)",
          }}
        />
      );
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 90,90 10,90"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
        </svg>
      );
    case "ring":
      return (
        <div
          className="w-full h-full rounded-full"
          style={{
            border: "4px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          }}
        />
      );
  }
}
