"use client";

interface AlgorithmBadgeProps {
  name: string;
  standard: string;
}

export function AlgorithmBadge({ name, standard }: AlgorithmBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2">
      <span className="text-white font-mono text-sm">{name}</span>
      <span className="text-xs text-neutral-500">{standard}</span>
    </span>
  );
}
