"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Navbar = ({ className }: { className?: string }) => {
  const [activeSection, setActiveSection] = useState("home");

  const navItems = [
    { name: "Home", link: "#home" },
    { name: "About", link: "#about" },
    { name: "Skills", link: "#skills" },
    { name: "Experience", link: "#experience" },
    { name: "Projects", link: "#projects" },
    { name: "Blog", link: "/blog" },
    { name: "Contact", link: "#contact" },
  ];

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-4 inset-x-0 max-w-2xl mx-auto z-50 bg-black/80 backdrop-blur-lg border border-white/[0.2] rounded-full px-8 py-3",
        className
      )}
    >
      <div className="flex items-center justify-center gap-8">
        {navItems.map((item) => {
          const isAnchorLink = item.link.startsWith('#');
          const sectionId = isAnchorLink ? item.link.substring(1) : item.link;

          return (
            <a
              key={item.name}
              href={item.link}
              onClick={() => isAnchorLink && setActiveSection(sectionId)}
              className={cn(
                "relative text-neutral-400 hover:text-white transition-colors duration-200 text-sm",
                activeSection === sectionId && "text-white"
              )}
            >
              {item.name}
              {activeSection === sectionId && isAnchorLink && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-white/10 rounded-full -z-10"
                  transition={{ type: "spring", duration: 0.6 }}
                />
              )}
            </a>
          );
        })}
      </div>
    </motion.div>
  );
};
