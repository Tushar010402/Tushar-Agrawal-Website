"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ExternalLink, Github } from "lucide-react";
import { TiltCard } from "./tilt-card";

interface ProjectItem {
  title: string;
  description: string;
  longDescription?: string;
  tech: string[];
  achievements: string[];
  link?: string;
  github?: string;
  status: "Live" | "In Development" | "Completed";
}

export const ProjectGrid = ({
  items,
  className,
}: {
  items: ProjectItem[];
  className?: string;
}) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-6 py-10",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item.title}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full block rounded-3xl"
                style={{
                  background: `linear-gradient(135deg, var(--surface-hover), var(--surface))`,
                }}
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <TiltCard>
            <ProjectCard item={item} />
          </TiltCard>
        </div>
      ))}
    </div>
  );
};

const ProjectCard = ({ item }: { item: ProjectItem }) => {
  return (
    <div
      className="rounded-2xl h-full w-full p-6 overflow-hidden border relative z-20 transition-all duration-300"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="relative z-50">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold",
              item.status === "Live" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
              item.status === "In Development" &&
                "bg-blue-500/10 text-blue-400 border border-blue-500/20",
              item.status === "Completed" &&
                "bg-purple-500/10 text-purple-400 border border-purple-500/20"
            )}
          >
            {item.status}
          </span>

          {/* Links */}
          <div className="flex gap-2">
            {item.github && (
              <a
                href={item.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: "var(--surface-hover)",
                }}
                aria-label="View on GitHub"
              >
                <Github className="w-4 h-4 text-theme-secondary" />
              </a>
            )}
            {item.link && item.link !== "#" && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: "var(--surface-hover)",
                }}
                aria-label="View live project"
              >
                <ExternalLink className="w-4 h-4 text-theme-secondary" />
              </a>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-theme mb-3 group-hover:text-theme-accent transition-colors">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-theme-secondary text-sm leading-relaxed mb-4">
          {item.description}
        </p>

        {/* Long Description */}
        {item.longDescription && (
          <p className="text-theme-tertiary text-xs leading-relaxed mb-4 italic">
            {item.longDescription}
          </p>
        )}

        {/* Achievements */}
        {item.achievements.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-theme-secondary mb-2">Key Achievements:</h4>
            <ul className="space-y-1">
              {item.achievements.map((achievement, idx) => (
                <li key={idx} className="text-xs text-theme-secondary flex items-start">
                  <span className="text-theme-accent mr-2">•</span>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech Stack */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-theme-muted mb-2 uppercase tracking-wider">
            Tech Stack
          </h4>
          <div className="flex flex-wrap gap-2">
            {item.tech.map((tech, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
