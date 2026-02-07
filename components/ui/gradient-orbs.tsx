"use client";

import { motion } from "framer-motion";

interface Orb {
  id: number;
  size: string;
  position: { x: string; y: string };
  color: string;
  blur: string;
  duration: number;
}

const orbs: Orb[] = [
  {
    id: 1,
    size: "600px",
    position: { x: "-10%", y: "-20%" },
    color: "var(--orb-primary)",
    blur: "100px",
    duration: 25,
  },
  {
    id: 2,
    size: "500px",
    position: { x: "70%", y: "60%" },
    color: "var(--orb-secondary)",
    blur: "120px",
    duration: 30,
  },
  {
    id: 3,
    size: "400px",
    position: { x: "50%", y: "-10%" },
    color: "var(--orb-accent)",
    blur: "80px",
    duration: 20,
  },
  {
    id: 4,
    size: "300px",
    position: { x: "20%", y: "70%" },
    color: "var(--orb-primary)",
    blur: "90px",
    duration: 22,
  },
];

export function GradientOrbs({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full opacity-30"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.position.x,
            top: orb.position.y,
            background: orb.color,
            filter: `blur(${orb.blur})`,
          }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -40, 30, -20, 0],
            scale: [1, 1.1, 0.9, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
