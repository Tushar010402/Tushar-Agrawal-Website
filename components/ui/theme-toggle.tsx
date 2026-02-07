"use client";

import { useTheme } from "@/components/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Sunset } from "lucide-react";

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  const icons = {
    dark: Moon,
    light: Sun,
    warm: Sunset,
  };

  const labels = {
    dark: "Dark mode",
    light: "Light mode",
    warm: "Warm mode",
  };

  const Icon = icons[theme];

  return (
    <motion.button
      onClick={cycleTheme}
      className="relative p-2.5 rounded-full backdrop-blur-sm border transition-all duration-300 group"
      style={{
        background: "color-mix(in srgb, var(--surface) 80%, transparent)",
        borderColor: "var(--border)",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={labels[theme]}
      title={`Switch theme (current: ${labels[theme]})`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Icon className="w-5 h-5 text-theme-secondary group-hover:text-theme-accent transition-colors" />
        </motion.div>
      </AnimatePresence>

      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10"
        style={{ background: "var(--accent-subtle)" }}
      />
    </motion.button>
  );
}
