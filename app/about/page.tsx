import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, Phone, MapPin } from "lucide-react";
import { HeroBlobs } from "@/components/ui/visuals/hero-blobs";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Tushar Agrawal - Full-Stack Engineer | Software Developer India",
  description: "Tushar Agrawal is a Full-Stack Engineer with 3+ years of experience building scalable healthcare SaaS platforms. Expert in Python, Go, FastAPI, Django, React, microservices, Docker, and AWS. Based in New Delhi, India.",
  keywords: ["Tushar Agrawal", "Full-Stack Engineer", "Backend Engineer", "Software Developer", "Python Developer", "Go Developer", "New Delhi", "India", "Healthcare SaaS", "Microservices"],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Tushar Agrawal - Full-Stack Engineer",
    description: "Full-Stack Engineer with 3+ years building scalable healthcare SaaS platforms. Expert in Python, Go, FastAPI, React, and microservices.",
    type: "profile",
    url: "/about",
  },
};

const stats = [
  { value: "3+", label: "Years building production systems" },
  { value: "500+", label: "Daily patients served" },
  { value: "50K+", label: "Daily API requests" },
  { value: "99.9%", label: "System uptime" },
];

const experience = [
  {
    role: "Software Developer",
    org: "Dr. Dangs Lab",
    period: "May 2023 — Present",
    place: "New Delhi, India",
    points: [
      "Built a HIPAA-compliant LIMS for 15+ departments serving 500+ daily patients.",
      "Engineered Go / FastAPI microservices running at 99.9% uptime.",
      "Automated medical report extraction with Python OCR (1,000+ daily reports).",
      "Designed an API gateway handling 50,000+ daily requests at sub-100ms latency.",
    ],
  },
  {
    role: "Frontend Developer",
    org: "BeanByte Softwares",
    period: "Feb 2023 — May 2023",
    place: "Jaipur, India",
    points: [
      "Developed 10+ production React.js applications.",
      "Optimized Redux implementation, cutting page load times by 25%.",
    ],
  },
  {
    role: "Frontend Developer Intern",
    org: "GoBOLT",
    period: "Jun 2022 — Dec 2022",
    place: "Gurugram, India",
    points: [
      "Built shipment-tracking features for 1,000+ daily users.",
      "Integrated frontend components with backend logistics APIs.",
    ],
  },
];

const projects = [
  {
    name: "LiquorPro",
    image: "/images/projects/liquorpro.svg",
    href: "https://github.com/Tushar010402",
    blurb: "Enterprise inventory & billing platform serving 20+ businesses and 80+ users across Uttar Pradesh. Go, Flutter, Redis, Kafka, PostgreSQL.",
  },
  {
    name: "FOMOA — India-First AI Search",
    image: "/images/projects/fomoa.svg",
    href: "/blog/fomoa-ai-complete-guide-features-2026",
    blurb: "AI search engine optimized for the Indian context with Hindi/Hinglish support, trained on 86,000+ samples from 150+ authoritative Indian sources.",
  },
  {
    name: "QAuth & QuantumShield",
    image: "/images/projects/qauth.svg",
    href: "/qauth",
    blurb: "A post-quantum authentication protocol and cryptography library implementing NIST FIPS 203/204/205 in Rust + WASM.",
  },
  {
    name: "Dr. Dangs Lab LIMS",
    image: "/images/projects/lims.svg",
    href: "#contact",
    blurb: "HIPAA-compliant Laboratory Information Management System processing 10,000+ monthly medical records with real-time reporting and OCR automation.",
  },
];

const skills = [
  { title: "Languages", items: "Python · Go · TypeScript · JavaScript" },
  { title: "Backend & APIs", items: "FastAPI · Django · Node.js · gRPC · REST · GraphQL" },
  { title: "AI Engineering", items: "LLM Integration · AI Agent Backends · MCP · RAG Pipelines" },
  { title: "Frontend", items: "React · Next.js · Tailwind" },
  { title: "Data & Messaging", items: "PostgreSQL · Redis · MongoDB · Apache Kafka · RabbitMQ" },
  { title: "Cloud-Native & DevOps", items: "AWS · Docker · Kubernetes · Nginx · CI/CD · Observability" },
];

export default function AboutPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusharagrawal.in";

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Tushar Agrawal",
    description: "Learn about Tushar Agrawal, a Full-Stack Engineer specializing in Python, Go, React, and healthcare SaaS platforms.",
    url: `${siteUrl}/about`,
    mainEntity: {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: "Tushar Agrawal",
      jobTitle: "Full-Stack Engineer",
      description: "Tushar Agrawal is a Full-Stack Engineer with 3+ years of experience building scalable healthcare SaaS platforms, microservices, and event-driven architectures.",
      image: `${siteUrl}/android-chrome-512x512.png`,
      url: siteUrl,
      sameAs: [
        "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
        "https://github.com/Tushar010402",
      ],
    },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: "About", path: "/about" }])) }}
      />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ opacity: 0.5 }}>
          <HeroBlobs />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "clamp(48px, 7vw, 96px) clamp(48px, 7vw, 96px)",
            maskImage: "radial-gradient(110% 80% at 25% 0%, #000 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(110% 80% at 25% 0%, #000 30%, transparent 80%)",
            opacity: 0.55,
          }}
        />
        <div className="clay-container relative">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
            <div>
              <p className="clay-rise clay-eyebrow mb-6 inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
                About · New Delhi, India
              </p>
              <h1 className="clay-rise clay-rise-1 clay-display max-w-[16ch]">
                Hi, I&apos;m Tushar Agrawal.
              </h1>
              <p className="clay-rise clay-rise-2 clay-lead text-theme-secondary mt-8 max-w-2xl">
                A <strong className="text-theme">Full-Stack Engineer</strong> with 3+ years building scalable,
                HIPAA-compliant healthcare platforms, distributed systems, and post-quantum infrastructure —
                front to back, with Python, Go, TypeScript and React.
              </p>
              <div className="clay-rise clay-rise-3 flex flex-wrap items-center gap-4 mt-10">
                <a href="#contact" className="clay-btn clay-btn-dark">
                  Get in touch <ArrowUpRight className="w-4 h-4" />
                </a>
                <a href="/Tushar_Agrawal_Resume.pdf" download className="clay-btn clay-btn-ghost">
                  Download résumé
                </a>
              </div>
            </div>

            {/* Monogram portrait card */}
            <div className="clay-rise clay-rise-2 hidden lg:block">
              <div
                className="relative rounded-3xl aspect-[4/5] overflow-hidden flex items-center justify-center"
                style={{
                  background: "linear-gradient(150deg, #0b1220, #10261f)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: "radial-gradient(60% 50% at 50% 35%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)" }}
                />
                <div className="relative text-center">
                  <div
                    className="font-bold leading-none"
                    style={{
                      fontFamily: "var(--font-display), system-ui, sans-serif",
                      fontSize: "clamp(5rem, 12vw, 9rem)",
                      background: "linear-gradient(135deg, #34d399, #818cf8)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    TA
                  </div>
                  <p className="text-white/70 mt-4 text-sm tracking-wide uppercase">Full-Stack Engineer</p>
                </div>
                <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 flex-wrap px-5">
                  {["Python", "Go", "TypeScript", "AI"].map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full text-white/80" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8 mt-20">
            {stats.map((s) => (
              <div key={s.label} className="clay-reveal">
                <div className="clay-stat text-[var(--accent)]">{s.value}</div>
                <div className="text-theme-secondary mt-2 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Story ===== */}
      <section className="clay-container clay-section">
        <hr className="clay-rule mb-16" />
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10">
          <h2 className="clay-h2">Who I am.</h2>
          <div className="max-w-2xl">
            <p className="clay-lead text-theme-secondary">
              I&apos;m a Full-Stack Engineer based in New Delhi who likes the messy middle — the part where
              an idea has to survive real traffic, real data, and real users.
            </p>
            <p className="text-theme-secondary text-lg leading-relaxed mt-6">
              Currently I work as a Software Developer at <strong className="text-theme">Dr. Dangs Lab</strong>,
              one of India&apos;s leading pathology laboratories, where I build HIPAA-compliant Laboratory
              Information Management Systems serving 500+ daily patients across 15+ departments. Outside of work
              I build post-quantum security tooling and an India-first AI search engine.
            </p>
            <p className="text-theme-secondary text-lg leading-relaxed mt-6">
              I care about systems that stay up, stay secure, and stay simple enough for the next engineer to
              understand — front to back.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Experience timeline ===== */}
      <section className="clay-section" style={{ background: "var(--background-secondary)" }}>
        <div className="clay-container">
          <p className="clay-eyebrow mb-4">Experience</p>
          <h2 className="clay-h2 mb-16">Where I&apos;ve worked.</h2>
          <div className="space-y-px">
            {experience.map((e) => (
              <div key={e.org} className="clay-reveal grid md:grid-cols-[1fr_2fr] gap-6 py-10" style={{ borderTop: "1px solid var(--border)" }}>
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{e.org}</h3>
                  <p className="text-theme-accent font-medium mt-1">{e.role}</p>
                  <p className="text-theme-secondary text-sm mt-2 flex items-center gap-2">
                    {e.period} <span className="text-theme-muted">·</span> {e.place}
                  </p>
                </div>
                <ul className="space-y-3">
                  {e.points.map((p) => (
                    <li key={p} className="text-theme-secondary leading-relaxed flex gap-3">
                      <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Projects ===== */}
      <section className="clay-container clay-section">
        <p className="clay-eyebrow mb-4">Selected Work</p>
        <h2 className="clay-h2 mb-14">Things I&apos;ve built.</h2>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {projects.map((p) => (
            <Link key={p.name} href={p.href} className="clay-card group block h-full overflow-hidden clay-reveal">
              <div className="relative h-48 md:h-52 overflow-hidden">
                <img
                  src={p.image}
                  alt={`${p.name} cover`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <ArrowUpRight className="absolute top-5 right-5 w-6 h-6 text-white/90 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div className="p-6 md:p-8">
                <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
                <p className="text-theme-secondary mt-3 leading-relaxed">{p.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Skills ===== */}
      <section className="clay-section" style={{ background: "var(--background-secondary)" }}>
        <div className="clay-container">
          <p className="clay-eyebrow mb-4">Toolkit</p>
          <h2 className="clay-h2 mb-16">What I work with.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
            {skills.map((c) => (
              <div key={c.title} className="clay-reveal">
                <h3 className="text-lg font-semibold mb-3">{c.title}</h3>
                <hr className="clay-rule mb-3" />
                <p className="text-theme-secondary">{c.items}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div className="clay-reveal">
              <h3 className="text-lg font-semibold mb-3">Architecture</h3>
              <hr className="clay-rule mb-3" />
              <p className="text-theme-secondary">Microservices · Event-Driven Systems · REST · GraphQL</p>
            </div>
            <div className="clay-reveal">
              <h3 className="text-lg font-semibold mb-3">Education</h3>
              <hr className="clay-rule mb-3" />
              <p className="text-theme-secondary">B.Tech, Computer Science — GD Goenka University, Gurugram (2019–2023) · Heritage School, Aligarh</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section id="contact" className="clay-container clay-section">
        <p className="clay-eyebrow mb-6">Get in touch</p>
        <h2 className="clay-h2 max-w-[18ch]">Let&apos;s build something that lasts.</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-12 max-w-3xl">
          <a href="mailto:tusharagrawal0104@gmail.com" className="clay-card flex items-center gap-4 p-5 group">
            <Mail className="w-5 h-5 text-theme-accent shrink-0" />
            <span className="text-theme-secondary group-hover:text-theme transition-colors">tusharagrawal0104@gmail.com</span>
          </a>
          <a href="tel:+918126816664" className="clay-card flex items-center gap-4 p-5 group">
            <Phone className="w-5 h-5 text-theme-accent shrink-0" />
            <span className="text-theme-secondary group-hover:text-theme transition-colors">+91-8126816664</span>
          </a>
          <a href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a" target="_blank" rel="noopener noreferrer" className="clay-card flex items-center gap-4 p-5 group">
            <svg className="w-5 h-5 text-theme-accent shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span className="text-theme-secondary group-hover:text-theme transition-colors">LinkedIn</span>
          </a>
          <a href="https://github.com/Tushar010402" target="_blank" rel="noopener noreferrer" className="clay-card flex items-center gap-4 p-5 group">
            <svg className="w-5 h-5 text-theme-accent shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <span className="text-theme-secondary group-hover:text-theme transition-colors">GitHub</span>
          </a>
        </div>
        <p className="text-theme-muted text-sm mt-12 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> New Delhi, India · Updated June 2026 ·
          <Link href="/blog" className="text-theme-accent hover:underline">Read my blog</Link>
        </p>
      </section>
    </div>
  );
}
