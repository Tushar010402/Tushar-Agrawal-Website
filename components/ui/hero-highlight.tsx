"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { useEntitySystem, type HoveredEntity } from "./hero-entities";
import { EntityTooltip } from "./entity-tooltip";

export const HeroHighlight = ({
  children,
  className,
  containerClassName,
  onOpenChat,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onOpenChat?: (topic: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);
  const [clickedEntity, setClickedEntity] = useState<HoveredEntity | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleEntityHover = useCallback((entity: HoveredEntity | null) => {
    setHoveredEntity(entity);
  }, []);

  const handleEntityClick = useCallback((entity: HoveredEntity | null) => {
    if (entity) {
      setClickedEntity(entity);
      // Auto-dismiss after 4 seconds
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => setClickedEntity(null), 4000);
    } else {
      setClickedEntity(null);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    }
  }, []);

  const handleChatAbout = useCallback((topic: string) => {
    setClickedEntity(null);
    onOpenChat?.(topic);
  }, [onOpenChat]);

  useEntitySystem(canvasRef, containerRef, handleEntityHover, handleEntityClick);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[40rem] flex items-center justify-center w-full group transition-theme",
        containerClassName
      )}
      style={{ background: "var(--background)" }}
    >
      <motion.canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      <div className={cn("relative z-20 w-full h-full flex flex-col items-center justify-center pointer-events-none", className)}>
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>

      {/* Entity tooltip layer — above navbar (z-50) so tooltip is never hidden */}
      <div className="absolute inset-0 z-[55] pointer-events-none">
        <EntityTooltip
          entity={hoveredEntity}
          clickedEntity={clickedEntity}
          containerRect={containerRect}
          onChatAbout={handleChatAbout}
        />
      </div>
    </div>
  );
};

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.span
      initial={{
        backgroundSize: "0% 100%",
      }}
      animate={{
        backgroundSize: "100% 100%",
      }}
      transition={{
        duration: 2,
        ease: "linear",
        delay: 0.5,
      }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
        background: `linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #a855f7))`,
        backgroundSize: "0% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      className={cn(
        `relative inline-block pb-1 px-1`,
        className
      )}
    >
      {children}
    </motion.span>
  );
};
