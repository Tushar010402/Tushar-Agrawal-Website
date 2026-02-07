"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { HoveredEntity, EntityType } from "./hero-entities";

const TYPE_ICONS: Record<EntityType, string> = {
  qubit: "\u269B",
  neuron: "\uD83E\uDDE0",
  circuit: "\u26A1",
  code: "\uD83D\uDCBB",
  hexnode: "\u2B21",
};

interface EntityTooltipProps {
  entity: HoveredEntity | null;
  clickedEntity: HoveredEntity | null;
  containerRect: DOMRect | null;
  onChatAbout: (topic: string) => void;
}

const TOOLTIP_WIDTH = 280;
const GAP = 20;
const NAVBAR_SAFE_ZONE = 90; // keep tooltip below navbar area

export function EntityTooltip({ entity, clickedEntity, containerRect, onChatAbout }: EntityTooltipProps) {
  const active = clickedEntity || entity;
  const isClickMode = !!clickedEntity;

  if (!containerRect || !active) return null;

  // Show below if entity is in the top section (navbar zone + buffer)
  const showBelow = active.y < NAVBAR_SAFE_ZONE + 60;

  // Horizontal: center on entity, clamp to container edges with padding
  const left = Math.min(
    Math.max(active.x - TOOLTIP_WIDTH / 2, 16),
    containerRect.width - TOOLTIP_WIDTH - 16
  );

  // Arrow horizontal position relative to tooltip
  const arrowLeft = Math.min(
    Math.max(active.x - left, 24),
    TOOLTIP_WIDTH - 24
  );

  // Vertical clamping: never go above NAVBAR_SAFE_ZONE
  let topVal: number | undefined;
  let bottomVal: number | undefined;

  if (showBelow) {
    topVal = Math.max(active.y + GAP + 14, NAVBAR_SAFE_ZONE);
    bottomVal = undefined;
  } else {
    topVal = undefined;
    bottomVal = containerRect.height - active.y + GAP + 14;
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.label}
          initial={{ opacity: 0, y: showBelow ? -8 : 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: showBelow ? -8 : 8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute pointer-events-auto"
          style={{
            left,
            top: topVal,
            bottom: bottomVal,
            width: TOOLTIP_WIDTH,
            zIndex: 40,
          }}
        >
          {/* Arrow */}
          <div
            className="absolute"
            style={{
              left: arrowLeft - 7,
              ...(showBelow ? { top: -7 } : { bottom: -7 }),
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                transform: "rotate(45deg)",
                background: "var(--surface)",
                border: "1px solid var(--border-hover)",
                ...(showBelow
                  ? { borderBottom: "none", borderRight: "none" }
                  : { borderTop: "none", borderLeft: "none" }),
              }}
            />
          </div>

          {/* Card — fully opaque */}
          <div
            className="rounded-xl px-5 py-4 relative"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-hover)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl leading-none">{TYPE_ICONS[active.type]}</span>
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {active.label}
              </span>
            </div>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {active.description}
            </p>

            {isClickMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChatAbout(active.label);
                }}
                className="mt-3 w-full text-xs font-semibold py-2 px-3 rounded-lg transition-all"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                }}
              >
                Chat about this &rarr;
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
