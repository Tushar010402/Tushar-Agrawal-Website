"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Getting Started", href: "/qauth/docs", icon: "rocket" },
  { label: "Full Auth System Guide", href: "/qauth/docs/full-auth", icon: "book" },
  { label: "API Reference", href: "/qauth/docs/api", icon: "code" },
  { label: "Policy Engine Guide", href: "/qauth/docs/policy", icon: "shield" },
];

function getPageName(pathname: string): string {
  const item = navItems.find((n) => n.href === pathname);
  return item?.label || "Docs";
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Mobile Header */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-theme-secondary hover:text-theme transition-colors"
          style={{ background: "var(--surface-hover)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/qauth" className="text-theme-secondary hover:text-theme transition-colors">
            QAuth
          </Link>
          <span className="text-theme-muted">/</span>
          <Link href="/qauth/docs" className="text-theme-secondary hover:text-theme transition-colors">
            Docs
          </Link>
          {pathname !== "/qauth/docs" && (
            <>
              <span className="text-theme-muted">/</span>
              <span className="text-theme">{getPageName(pathname)}</span>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 p-6 overflow-y-auto"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-theme">QAuth Docs</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-theme-secondary hover:text-theme transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex max-w-[1400px] mx-auto">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto p-6"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/qauth" className="text-theme-secondary hover:text-theme transition-colors">
              QAuth
            </Link>
            <span className="text-theme-muted">/</span>
            <span className="text-theme font-medium">Docs</span>
          </nav>

          <SidebarNav pathname={pathname} />

          {/* Back to QAuth */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <Link
              href="/qauth"
              className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to QAuth
            </Link>
            <Link
              href="/qauth/demo"
              className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors mt-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Interactive Demo
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 py-8 md:px-8 lg:px-12 lg:py-12 max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "text-theme-accent" : "text-theme-secondary hover:text-theme"
            }`}
            style={
              isActive
                ? {
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }
                : { border: "1px solid transparent" }
            }
          >
            {item.icon === "rocket" && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {item.icon === "book" && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )}
            {item.icon === "code" && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
            {item.icon === "shield" && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
