"use client";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface AIChatFabProps {
  onClick: () => void;
}

export function AIChatFab({ onClick }: AIChatFabProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-theme-lg transition-theme"
      style={{
        background: "var(--accent)",
        color: "#fff",
        boxShadow: "var(--shadow-glow)",
      }}
      aria-label="Open AI Tech Assistant"
    >
      <MessageCircle size={24} />
    </motion.button>
  );
}
