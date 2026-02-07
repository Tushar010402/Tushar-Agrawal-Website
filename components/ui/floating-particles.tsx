"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
}

export function FloatingParticles({
  count = 50,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
      });
    }
    setParticles(newParticles);
  }, [dimensions, count]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {particles.map((particle) => (
        <FloatingParticle
          key={particle.id}
          particle={particle}
          mouseX={smoothMouseX}
          mouseY={smoothMouseY}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      ))}
    </div>
  );
}

function FloatingParticle({
  particle,
  mouseX,
  mouseY,
  containerWidth,
  containerHeight,
}: {
  particle: Particle;
  mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>;
  containerWidth: number;
  containerHeight: number;
}) {
  const x = useMotionValue(particle.x);
  const y = useMotionValue(particle.y);
  const springX = useSpring(x, { stiffness: 20, damping: 10 });
  const springY = useSpring(y, { stiffness: 20, damping: 10 });

  useEffect(() => {
    let animationFrame: number;
    let currentAngle = particle.angle;

    const animate = () => {
      // Float animation
      currentAngle += particle.speed * 0.01;
      const baseX = particle.x + Math.sin(currentAngle) * 30;
      const baseY = particle.y + Math.cos(currentAngle * 0.5) * 20;

      // Mouse repulsion
      const mx = mouseX.get();
      const my = mouseY.get();
      const dx = baseX - mx;
      const dy = baseY - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 150;

      if (dist < maxDist && dist > 0) {
        const force = (1 - dist / maxDist) * 50;
        const newX = baseX + (dx / dist) * force;
        const newY = baseY + (dy / dist) * force;
        x.set(Math.max(0, Math.min(containerWidth, newX)));
        y.set(Math.max(0, Math.min(containerHeight, newY)));
      } else {
        x.set(Math.max(0, Math.min(containerWidth, baseX)));
        y.set(Math.max(0, Math.min(containerHeight, baseY)));
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [particle, mouseX, mouseY, x, y, containerWidth, containerHeight]);

  return (
    <motion.div
      className="absolute rounded-full bg-theme-accent"
      style={{
        x: springX,
        y: springY,
        width: particle.size,
        height: particle.size,
        opacity: particle.opacity,
      }}
    />
  );
}
