"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function TiltCard({
  children,
  className,
  maxTilt = 8,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [canHover, setCanHover] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 15 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    setCanHover(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || !canHover) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);

      rotateX.set(-y * maxTilt);
      rotateY.set(x * maxTilt);

      if (glareRef.current) {
        const gx = ((e.clientX - rect.left) / rect.width) * 100;
        const gy = ((e.clientY - rect.top) / rect.height) * 100;
        glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.08) 0%, transparent 60%)`;
      }
    },
    [maxTilt, rotateX, rotateY, canHover]
  );

  const handleMouseEnter = useCallback(() => {
    if (canHover) setIsHovering(true);
  }, [canHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  // Always render the same structure to avoid layout shifts
  return (
    <div
      className={cn("w-full h-full", className)}
      style={canHover ? { perspective: "1000px" } : undefined}
    >
      <motion.div
        ref={ref}
        onMouseMove={canHover ? handleMouseMove : undefined}
        onMouseEnter={canHover ? handleMouseEnter : undefined}
        onMouseLeave={canHover ? handleMouseLeave : undefined}
        style={
          canHover
            ? {
                rotateX: springRotateX,
                rotateY: springRotateY,
                transformStyle: "preserve-3d" as const,
              }
            : undefined
        }
        className="relative w-full h-full"
      >
        {children}
        {/* Glare overlay */}
        {canHover && (
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 rounded-2xl z-30 transition-opacity duration-300"
            style={{
              opacity: isHovering ? 1 : 0,
              borderRadius: "inherit",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
