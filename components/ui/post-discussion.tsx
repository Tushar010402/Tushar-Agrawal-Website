"use client";

import { useEffect, useRef, useState } from "react";

// Community Q&A per post via giscus (GitHub Discussions). Renders nothing until
// NEXT_PUBLIC_GISCUS_REPO / REPO_ID / CATEGORY_ID are set (get them at giscus.app
// after enabling Discussions on the repo and installing the giscus GitHub app).
// Lazy-mounts when scrolled near, so the iframe never costs initial page load.
const GISCUS_REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const GISCUS_REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const GISCUS_CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

export function PostDiscussion() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return;
    if (!GISCUS_REPO || !GISCUS_REPO_ID || !GISCUS_CATEGORY_ID) return;
    if (containerRef.current.querySelector("script, iframe")) return;

    const isLight = document.documentElement.classList.contains("light");
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", GISCUS_REPO);
    script.setAttribute("data-repo-id", GISCUS_REPO_ID);
    script.setAttribute("data-category", "Blog Q&A");
    script.setAttribute("data-category-id", GISCUS_CATEGORY_ID);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", isLight ? "light" : "transparent_dark");
    script.setAttribute("data-lang", "en");
    script.setAttribute("data-loading", "lazy");
    containerRef.current.appendChild(script);
  }, [shouldLoad]);

  if (!GISCUS_REPO || !GISCUS_REPO_ID || !GISCUS_CATEGORY_ID) {
    return null;
  }

  return (
    <section
      className="mt-12 max-w-3xl rounded-xl p-6 md:p-7"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="clay-eyebrow mb-2">Community Q&amp;A</p>
      <h2 className="text-xl font-semibold text-theme mb-2">Questions about this article?</h2>
      <p className="text-sm text-theme-secondary mb-6">
        Ask below — answers are public and help the next reader. Sign in with GitHub to post;
        every thread also lives in the open on GitHub Discussions.
      </p>
      <div ref={containerRef} />
    </section>
  );
}
