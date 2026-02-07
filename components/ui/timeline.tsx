"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full font-sans md:px-10 transition-theme"
      style={{ background: "var(--background)" }}
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <h2 className="text-lg md:text-4xl mb-4 text-theme max-w-4xl">
          Professional Timeline
        </h2>
        <p className="text-theme-secondary text-sm md:text-base max-w-sm">
          My journey through various roles and experiences
        </p>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div
                className="h-10 absolute left-3 md:left-3 w-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--background)" }}
              >
                <div
                  className="h-4 w-4 rounded-full border p-2"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-theme-tertiary">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-theme-tertiary">
                {item.title}
              </h3>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          {/* Background line */}
          <div
            className="absolute inset-0 w-full"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, var(--border) 10%, var(--border) 90%, transparent 100%)`,
            }}
          />
          {/* Progress indicator */}
          <motion.div
            className="absolute inset-x-0 top-0 w-[2px] rounded-full"
            style={{
              height: heightTransform,
              opacity: opacityTransform,
              background: `linear-gradient(to bottom, transparent, var(--accent), color-mix(in srgb, var(--accent) 70%, #a855f7))`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
