"use client";

interface AlgorithmBadgeProps {
  name: string;
  standard: string;
}

export function AlgorithmBadge({ name, standard }: AlgorithmBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <span className="text-theme font-mono text-sm">{name}</span>
      <span className="text-xs text-theme-tertiary">{standard}</span>
    </span>
  );
}
