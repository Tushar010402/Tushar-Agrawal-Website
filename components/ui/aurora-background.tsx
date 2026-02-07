"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function AuroraBackground({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Primary aurora blob */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px]"
        style={{
          background: "var(--orb-primary)",
          left: "-10%",
          top: "-20%",
        }}
        animate={{
          x: [0, 100, 50, -50, 0],
          y: [0, 50, 100, 30, 0],
          scale: [1, 1.2, 1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary aurora blob */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px]"
        style={{
          background: "var(--orb-secondary)",
          right: "-5%",
          top: "30%",
        }}
        animate={{
          x: [0, -80, -40, 40, 0],
          y: [0, 80, -40, 60, 0],
          scale: [1, 1.1, 1.2, 1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Accent aurora blob */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px]"
        style={{
          background: "var(--orb-accent)",
          left: "40%",
          bottom: "-10%",
        }}
        animate={{
          x: [0, 60, -30, 80, 0],
          y: [0, -60, -30, 20, 0],
          scale: [1, 1.15, 1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Small floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[200px] h-[200px] rounded-full blur-[60px]"
          style={{
            background: i % 2 === 0 ? "var(--orb-primary)" : "var(--orb-secondary)",
            left: `${20 + i * 15}%`,
            top: `${10 + i * 20}%`,
            opacity: 0.5,
          }}
          animate={{
            x: [0, 30 * (i % 2 === 0 ? 1 : -1), 0],
            y: [0, 40 * (i % 2 === 0 ? -1 : 1), 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(var(--text-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
