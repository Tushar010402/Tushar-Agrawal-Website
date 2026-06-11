"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { Counter, Marquee, RotatingWord } from "@/components/ui/visuals/motion-bits";
import { AuroraRidge } from "@/components/ui/visuals/aurora-ridge";
import { CardSheen, FocusText, ParallaxCover } from "@/components/ui/visuals/cinematic-bits";

// Chat is below-the-fold UX; keep its 400+ lines + framer-motion out of first-load JS.
const AIChatFab = dynamic(() => import("@/components/ui/ai-chat-fab").then((m) => m.AIChatFab), {
  ssr: false,
});
const AIChatPanel = dynamic(
  () => import("@/components/ui/ai-chat-panel").then((m) => m.AIChatPanel),
  { ssr: false }
);

// ---- Content -------------------------------------------------------------

const stats = [
  { num: 3, suffix: "+", label: "Years experience" },
  { num: 80, suffix: "+", label: "Active users" },
  { num: 20, suffix: "+", label: "Businesses served" },
  { num: 99.9, suffix: "%", label: "System uptime" },
];

const techStack = [
  "Python", "Go", "TypeScript", "FastAPI", "Django", "Next.js", "React",
  "PostgreSQL", "Redis", "Apache Kafka", "Docker", "Kubernetes", "AWS",
  "AI Agents", "LLM Integration", "gRPC", "CI/CD", "Microservices",
];

const projects = [
  {
    name: "LiquorPro",
    year: "2024",
    tags: ["Go", "Kafka", "PostgreSQL", "Flutter"],
    description:
      "Enterprise inventory & billing platform serving 20+ businesses and 80+ users across Uttar Pradesh.",
    href: "https://github.com/Tushar010402",
    accent: "#4f46e5",
    image: "/images/projects/liquorpro.svg",
  },
  {
    name: "LIMS — Dr. Dangs Lab",
    year: "2023",
    tags: ["Go", "FastAPI", "Microservices", "HIPAA"],
    description:
      "HIPAA-compliant Laboratory Information Management System for 15+ departments and 500+ daily patients.",
    href: "#contact",
    accent: "#0ea5e9",
    image: "/images/projects/lims.svg",
  },
  {
    name: "FOMOA — AI Search",
    year: "2026",
    tags: ["LLM", "RAG", "Python", "India-first"],
    description:
      "India-first AI search engine with native Hindi/Hinglish, trained on 86,000+ samples from 150+ Indian sources.",
    href: "/blog/fomoa-ai-complete-guide-features-2026",
    accent: "#f59e0b",
    image: "/images/projects/fomoa.svg",
  },
  {
    name: "QAuth & QuantumShield",
    year: "2026",
    tags: ["Rust", "Post-Quantum", "ML-DSA", "Security"],
    description:
      "A post-quantum authentication protocol and cryptography library implementing NIST FIPS 203/204/205.",
    href: "/qauth",
    accent: "#10b981",
    image: "/images/projects/qauth.svg",
  },
];

const capabilities = [
  { title: "Languages", items: "Python · Go · TypeScript · JavaScript" },
  { title: "Backend & APIs", items: "FastAPI · Django · Node.js · gRPC · REST · GraphQL" },
  { title: "AI Engineering", items: "LLM Integration · AI Agent Backends · MCP · RAG Pipelines" },
  { title: "Data & Messaging", items: "PostgreSQL · Redis · MongoDB · Apache Kafka · RabbitMQ" },
  { title: "Cloud-Native & DevOps", items: "AWS · Docker · Kubernetes · Nginx · CI/CD · Observability" },
  { title: "Architecture & Security", items: "Microservices · Event-Driven · HIPAA · Post-Quantum Crypto" },
];

const experience = [
  { role: "Software Developer", org: "Dr. Dangs Lab", period: "May 2023 — Present", place: "New Delhi" },
  { role: "Frontend Developer", org: "BeanByte Softwares", period: "Feb 2023 — May 2023", place: "Jaipur" },
  { role: "Frontend Developer Intern", org: "GoBOLT", period: "Jun 2022 — Dec 2022", place: "Gurugram" },
];

const writing = [
  {
    title: "The Cache Stampede That Took Down Our API",
    tag: "Performance",
    href: "/blog/redis-cache-stampede-p99-latency-war-story",
  },
  {
    title: "Post-Quantum Cryptography Deadlines: 2027, 2030 & 2035",
    tag: "Security",
    href: "/blog/post-quantum-cryptography-deadlines-2027-2030-2035",
  },
  {
    title: "Building Backends for AI Agents",
    tag: "Architecture",
    href: "/blog/building-backends-for-ai-agents-idempotency-retries-state",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who is Tushar Agrawal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tushar Agrawal is a Backend Engineer based in New Delhi, India with 3+ years of experience building scalable healthcare SaaS platforms. He specializes in Python, Go, FastAPI, Django, microservices architecture, and cloud technologies. He currently works at Dr. Dangs Lab building HIPAA-compliant healthcare systems.",
      },
    },
    {
      "@type": "Question",
      name: "What technologies does Tushar Agrawal work with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tushar Agrawal works with Python, Go, TypeScript, FastAPI, Django, React, Next.js, PostgreSQL, Redis, Apache Kafka, Docker, Kubernetes, AWS, and Nginx. He specializes in microservices architecture, event-driven systems, and building scalable backend systems.",
      },
    },
    {
      "@type": "Question",
      name: "Where does Tushar Agrawal work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tushar Agrawal currently works as a Software Developer at Dr. Dangs Lab in New Delhi, India, where he builds Laboratory Information Management Systems (LIMS) and healthcare SaaS platforms serving 80+ users across 20+ businesses.",
      },
    },
    {
      "@type": "Question",
      name: "How to contact Tushar Agrawal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can contact Tushar Agrawal via email at tusharagrawal0104@gmail.com, phone at +91-8126816664, LinkedIn at linkedin.com/in/tushar-agrawal-91b67a28a, or GitHub at github.com/Tushar010402.",
      },
    },
  ],
};

// ---- Helpers -------------------------------------------------------------

function Reveal({ children, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <div className={`clay-reveal ${className ?? ""}`}>{children}</div>;
}

// ---- Page ----------------------------------------------------------------

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="w-full" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ===== Hero — full-screen live-rendered mountain scene ===== */}
      <section id="home" className="relative overflow-hidden min-h-[100svh] flex items-center pt-28 pb-24">
        {/* Live shader scene: layered ridgelines, fog and light rays, panned by scroll.
            Falls back to the pure-CSS blobs when WebGL is unavailable. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <AuroraRidge />
        </div>
        {/* Legibility scrim — anchors the headline against the bright sky */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--background) 72%, transparent) 0%, color-mix(in srgb, var(--background) 38%, transparent) 45%, transparent 72%)",
          }}
        />
        <div className="clay-container relative w-full">
          <p className="clay-rise clay-eyebrow mb-8 inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
            Tushar Agrawal — Full-Stack Engineer · New Delhi, India
          </p>

          <h1 className="clay-rise clay-rise-1 clay-display max-w-[18ch]">
            I build full-stack systems that{" "}
            <RotatingWord
              words={["scale.", "ship.", "endure.", "perform."]}
              className="text-[var(--accent)]"
            />
          </h1>

          <p className="clay-rise clay-rise-2 clay-lead text-theme-secondary mt-10 max-w-2xl">
            Three years building HIPAA-compliant healthcare platforms, distributed systems, and
            post-quantum infrastructure — front to back, with Python, Go, TypeScript, and a lot of
            production scars.
          </p>

          <div className="clay-rise clay-rise-3 flex flex-wrap items-center gap-4 mt-12">
            <a href="#work" className="clay-btn clay-btn-dark">
              View work <ArrowDown className="w-4 h-4" />
            </a>
            <a href="/Tushar_Agrawal_Resume.pdf" download className="clay-btn clay-btn-ghost">
              Download résumé <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Scroll cue */}
        <a
          href="#about"
          aria-label="Scroll to content"
          className="clay-rise clay-rise-4 scroll-cue absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <span className="scroll-cue-line" />
        </a>
      </section>

      {/* ===== Tech marquee ===== */}
      <section aria-label="Technologies" className="py-6 border-y" style={{ borderColor: "var(--border)" }}>
        <Marquee>
          {techStack.map((t) => (
            <span key={t} className="mx-6 text-xl md:text-2xl font-medium text-theme-tertiary">
              {t}
              <span className="mx-6 text-theme-muted">/</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* ===== Statement + stats ===== */}
      <section id="about" className="clay-container py-16 md:py-24">
        <Reveal>
          <hr className="clay-rule mb-16" />
          <FocusText as="p" className="clay-statement max-w-5xl">
            Full-Stack Engineer at <span className="text-theme">Dr. Dangs Lab</span>, building
            systems that serve <span className="text-theme">500+ daily patients</span> and{" "}
            <span className="text-theme">80+ businesses</span> — reliably, securely, at scale.
          </FocusText>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 mt-20">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <Counter value={s.num} suffix={s.suffix} className="clay-stat block text-[var(--accent)]" />
              <div className="text-theme-secondary mt-2 text-sm md:text-base">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Selected Work ===== */}
      <section id="work" className="clay-container clay-section">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-14">
            <div>
              <p className="clay-eyebrow mb-4">Selected Work</p>
              <h2 className="clay-h2">Things I&apos;ve built.</h2>
            </div>
          </div>
        </Reveal>

        <div id="projects" className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {projects.map((p, i) => (
            <Reveal key={p.name} delay={(i % 2) * 0.1}>
              <Link href={p.href} className="clay-card group block h-full overflow-hidden">
                <CardSheen />
                {/* Poster cover art — drifts against scroll like a camera move */}
                <div className="relative h-48 md:h-56">
                  <ParallaxCover className="absolute inset-0">
                    <img
                      src={p.image}
                      alt={`${p.name} cover`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </ParallaxCover>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent 55%)" }} />
                  <span className="absolute bottom-4 left-5 text-white/85 text-sm font-medium">{p.year}</span>
                  <ArrowUpRight className="absolute top-5 right-5 w-6 h-6 text-white/90 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <div className="p-6 md:p-8">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">{p.name}</h3>
                  <p className="text-theme-secondary mt-3 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-3 py-1 rounded-full text-theme-secondary"
                        style={{ background: "var(--background-secondary)", border: "1px solid var(--border)" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Capabilities ===== */}
      <section id="skills" className="clay-section" style={{ background: "var(--background-secondary)" }}>
        <div className="clay-container">
          <Reveal>
            <p className="clay-eyebrow mb-4">Capabilities</p>
            <h2 className="clay-h2 mb-16">What I work with.</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
            {capabilities.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 0.08}>
                <h3 className="text-lg font-semibold mb-3">{c.title}</h3>
                <hr className="clay-rule mb-3" />
                <p className="text-theme-secondary leading-relaxed">{c.items}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Experience ===== */}
      <section className="clay-container clay-section">
        <Reveal>
          <p className="clay-eyebrow mb-4">Experience</p>
          <h2 className="clay-h2 mb-14">Where I&apos;ve worked.</h2>
        </Reveal>
        <div>
          {experience.map((e, i) => (
            <Reveal key={e.org} delay={i * 0.06}>
              <div className="grid md:grid-cols-12 gap-2 md:gap-6 items-baseline py-7" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="md:col-span-5 text-2xl md:text-3xl font-semibold tracking-tight">{e.org}</div>
                <div className="md:col-span-4 text-theme-secondary">{e.role}</div>
                <div className="md:col-span-3 text-theme-tertiary md:text-right">
                  {e.period} · {e.place}
                </div>
              </div>
            </Reveal>
          ))}
          <hr className="clay-rule" />
        </div>
      </section>

      {/* ===== Writing ===== */}
      <section id="blog" className="clay-section" style={{ background: "var(--background-secondary)" }}>
        <div className="clay-container">
          <Reveal>
            <div className="flex items-end justify-between flex-wrap gap-4 mb-14">
              <div>
                <p className="clay-eyebrow mb-4">Writing</p>
                <h2 className="clay-h2">From the blog.</h2>
              </div>
              <Link href="/blog" className="clay-link text-lg">All articles →</Link>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {writing.map((w, i) => (
              <Reveal key={w.href} delay={i * 0.1}>
                <Link href={w.href} className="clay-card group block h-full p-7">
                  <CardSheen />
                  <span className="clay-eyebrow">{w.tag}</span>
                  <h3 className="text-xl font-semibold mt-4 leading-snug tracking-tight group-hover:text-theme-accent transition-colors">
                    {w.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 mt-6 text-theme-secondary text-sm">
                    Read <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section id="contact" className="clay-container clay-section text-center">
        <Reveal>
          <p className="clay-eyebrow mb-8">Get in touch</p>
          <h2 className="clay-display mb-10">
            <FocusText>Let&apos;s build something.</FocusText>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:tusharagrawal0104@gmail.com" className="clay-btn clay-btn-dark">
              tusharagrawal0104@gmail.com <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 text-theme-secondary">
            <a href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a" target="_blank" rel="noopener noreferrer" className="clay-link">LinkedIn</a>
            <a href="https://github.com/Tushar010402" target="_blank" rel="noopener noreferrer" className="clay-link">GitHub</a>
            <Link href="/blog" className="clay-link">Blog</Link>
          </div>
        </Reveal>
      </section>

      <AIChatFab onClick={() => setIsChatOpen(true)} />
      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} topic={undefined} />
    </div>
  );
}
