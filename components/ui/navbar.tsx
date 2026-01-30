"use client";
import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const Navbar = ({ className }: { className?: string }) => {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = useCallback((link: string) => {
    const isAnchorLink = link.startsWith('#');
    if (isAnchorLink && isHomePage) {
      setActiveSection(link.substring(1));
    }
    setIsMobileMenuOpen(false);
  }, [isHomePage]);

  const isActive = (item: { name: string; link: string }) => {
    const isAnchorLink = item.link.startsWith('#');
    const sectionId = isAnchorLink ? item.link.substring(1) : item.link;

    if (isHomePage) {
      return isAnchorLink && activeSection === sectionId;
    }
    return item.link === pathname || (item.link === "/blog" && pathname.startsWith("/blog"));
  };

  return (
    <>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed top-4 inset-x-0 max-w-2xl mx-auto z-50 bg-black/80 backdrop-blur-lg border border-white/[0.2] rounded-full px-4 md:px-8 py-3",
          className
        )}
      >
        <div className="flex items-center justify-between md:justify-center gap-4 md:gap-8">
          {/* Mobile Logo - only visible on mobile */}
          <Link
            href="/"
            className="md:hidden text-white font-semibold text-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            TA
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center gap-8">
            {navItems.map((item) => {
              const href = getHref(item.link);
              const active = isActive(item);

              return (
                <Link
                  key={item.name}
                  href={href}
                  onClick={() => handleNavClick(item.link)}
                  className={cn(
                    "relative text-neutral-400 hover:text-white transition-colors duration-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full px-2 py-1",
                    active && "text-white"
                  )}
                >
                  {item.name}
                  {active && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white/10 rounded-full -z-10"
                      transition={{ type: "spring", duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <motion.span
              animate={isMobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="w-5 h-0.5 bg-white block"
            />
            <motion.span
              animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-5 h-0.5 bg-white block"
            />
            <motion.span
              animate={isMobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="w-5 h-0.5 bg-white block"
            />
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-black border-l border-neutral-800 z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6 pt-20">
                <nav className="space-y-1" role="navigation" aria-label="Mobile navigation">
                  {navItems.map((item, index) => {
                    const href = getHref(item.link);
                    const active = isActive(item);

                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={href}
                          onClick={() => handleNavClick(item.link)}
                          className={cn(
                            "block px-4 py-3 rounded-xl text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                            active
                              ? "bg-white/10 text-white"
                              : "text-neutral-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {item.name}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="mt-8 pt-8 border-t border-neutral-800">
                  <div className="space-y-4">
                    <a
                      href="mailto:tusharagrawal0104@gmail.com"
                      className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors text-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      tusharagrawal0104@gmail.com
                    </a>
                    <a
                      href="https://github.com/Tushar010402"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
