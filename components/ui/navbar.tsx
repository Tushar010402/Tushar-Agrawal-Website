"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Navbar = ({ className }: { className?: string }) => {
  const [activeSection, setActiveSection] = useState("home");
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const navItems = [
    { name: "Home", link: "#home" },
    { name: "About", link: "/about" },
    { name: "Skills", link: "#skills" },
    { name: "Experience", link: "#experience" },
    { name: "Projects", link: "#projects" },
    { name: "Blog", link: "/blog" },
    { name: "Contact", link: "#contact" },
  ];

  const getHref = (link: string) => {
    if (link.startsWith('#')) {
      return isHomePage ? link : `/${link}`;
    }
    return link;
  };

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
          const href = getHref(item.link);
          const isActive = isHomePage
            ? (isAnchorLink && activeSection === sectionId)
            : (item.link === pathname || (item.link === "/blog" && pathname.startsWith("/blog")));

          return (
            <a
              key={item.name}
              href={href}
              onClick={() => isAnchorLink && isHomePage && setActiveSection(sectionId)}
              className={cn(
                "relative text-neutral-400 hover:text-white transition-colors duration-200 text-sm",
                isActive && "text-white"
              )}
            >
              {item.name}
              {isActive && (
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
