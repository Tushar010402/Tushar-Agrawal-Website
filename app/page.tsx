"use client";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { TextScramble } from "@/components/ui/text-scramble";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { ProjectGrid } from "@/components/ui/project-card";
import { Timeline } from "@/components/ui/timeline";
import { Button } from "@/components/ui/moving-border";
import { MagneticElement } from "@/components/ui/magnetic-element";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight";
import { GlowBackground } from "@/components/ui/glow-background";
import { AIChatPanel } from "@/components/ui/ai-chat-panel";
import { AIChatFab } from "@/components/ui/ai-chat-fab";
import { useCallback, useRef, useState } from "react";

function MagneticTitle({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      x.set(dx * 0.03);
      y.set(dy * 0.03);
    },
    [x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
}

// Simple fade-up wrapper - no variants, no propagation issues
function FadeInSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTopic, setChatTopic] = useState<string | undefined>(undefined);

  const handleOpenChat = useCallback((topic: string) => {
    setChatTopic(topic);
    setIsChatOpen(true);
  }, []);

  return (
    <div className="w-full transition-theme" style={{ background: "var(--background)" }}>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden">
        <GlowBackground className="opacity-80" />
        <HeroHighlight containerClassName="pt-28" onOpenChat={handleOpenChat}>
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="currentColor" />
          <div className="text-2xl px-4 md:text-4xl lg:text-5xl font-bold max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto text-theme">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.3 }}
            >
              <MagneticTitle>
                Hi, I&apos;m{" "}
                <Highlight className="text-theme">
                  Tushar Agrawal
                </Highlight>
              </MagneticTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.6 }}
              className="mt-8"
            >
              <TextScramble
                text="Backend Engineer | 3+ YOE | Distributed Systems, Python, TypeScript, Apache & Nginx, PostgreSQL"
                className="text-xl md:text-2xl"
                delay={800}
                duration={2000}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.9 }}
              className="flex gap-4 flex-wrap justify-center mt-10"
            >
              <MagneticElement>
                <Button borderRadius="1.75rem" className="px-8 py-4 transition-theme" containerClassName="transition-theme">
                  <a href="/Tushar_Agrawal_Resume.pdf" download="Tushar_Agrawal_Resume.pdf" className="flex items-center gap-2 text-theme">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Resume
                  </a>
                </Button>
              </MagneticElement>
              <MagneticElement>
                <Button borderRadius="1.75rem" className="px-8 py-4 transition-theme" containerClassName="transition-theme">
                  <a href="mailto:tusharagrawal0104@gmail.com" className="flex items-center gap-2 text-theme">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Get in Touch
                  </a>
                </Button>
              </MagneticElement>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            className="absolute bottom-6 left-0 right-0 z-20 flex justify-center"
          >
            <a href="#about" className="flex flex-col items-center gap-1 text-theme-tertiary hover:text-theme-secondary transition-colors">
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Scroll</span>
              <svg className="w-4 h-4 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </motion.div>
        </HeroHighlight>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto relative">
        <FadeInSection>
          <h2 className="text-4xl md:text-6xl font-bold text-theme mb-12">About Me</h2>
        </FadeInSection>
        <FadeInSection delay={0.1}>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="card p-8">
              <h3 className="text-2xl font-bold text-theme mb-4">Professional Background</h3>
              <p className="text-theme-secondary text-base leading-relaxed">
                Full-Stack Developer with 3 years building scalable healthcare SaaS platforms serving 80+ users across 20+ businesses.
                Reduced operational costs by 90% through microservices architecture and AI automation. Collaborated with cross-functional
                teams and third-party vendors to deliver integrated solutions.
              </p>
            </div>
            <div className="card p-8">
              <h3 className="text-2xl font-bold text-theme mb-4">Technical Expertise</h3>
              <p className="text-theme-secondary text-base leading-relaxed">
                Proficient in Python, Go, React, and Next.js with hands-on experience in HIPAA-compliant systems and cloud deployment.
                Specialized in building high-performance distributed systems with event-driven architecture and microservices.
              </p>
            </div>
          </div>
        </FadeInSection>

        {/* Quick Stats */}
        <FadeInSection delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: "3+", label: "Years Experience", color: "var(--accent)" },
              { value: "80+", label: "Active Users", color: "#22c55e" },
              { value: "20+", label: "Businesses Served", color: "#a855f7" },
              { value: "99.9%", label: "System Uptime", color: "#f59e0b" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="card p-6 text-center"
                style={{
                  borderColor: `color-mix(in srgb, ${stat.color} 30%, transparent)`,
                  background: `linear-gradient(135deg, color-mix(in srgb, ${stat.color} 10%, var(--surface)), var(--surface))`,
                }}
              >
                <div className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-sm text-theme-secondary mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </FadeInSection>

        <FadeInSection delay={0.3}>
          <div className="flex gap-4 flex-wrap">
            <MagneticElement>
              <Button borderRadius="1.75rem" className="px-8 py-4 transition-theme" containerClassName="transition-theme">
                <a href="/Tushar_Agrawal_Resume.pdf" download="Tushar_Agrawal_Resume.pdf" className="flex items-center gap-2 text-theme">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Resume
                </a>
              </Button>
            </MagneticElement>
            <MagneticElement>
              <Button borderRadius="1.75rem" className="px-8 py-4 transition-theme" containerClassName="transition-theme">
                <a href="tel:+918126816664" className="flex items-center gap-2 text-theme">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +91-8126816664
                </a>
              </Button>
            </MagneticElement>
            <MagneticElement>
              <Button borderRadius="1.75rem" className="px-8 py-4 transition-theme" containerClassName="transition-theme">
                <a href="mailto:tusharagrawal0104@gmail.com" className="flex items-center gap-2 text-theme">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Me
                </a>
              </Button>
            </MagneticElement>
          </div>
        </FadeInSection>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <FadeInSection>
          <h2 className="text-4xl md:text-6xl font-bold text-theme mb-4">Skills & Technologies</h2>
          <p className="text-theme-secondary text-lg max-w-3xl mb-12">
            Comprehensive technical expertise across full-stack development, cloud infrastructure, and modern architecture patterns.
          </p>
        </FadeInSection>
        <FadeInSection delay={0.1}>
          <HoverEffect items={skillsData} />
        </FadeInSection>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-20">
        <FadeInSection>
          <Timeline data={experienceData} />
        </FadeInSection>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <FadeInSection>
          <h2 className="text-4xl md:text-6xl font-bold text-theme mb-4">Featured Projects</h2>
          <p className="text-theme-secondary text-lg max-w-3xl mb-12">
            A showcase of my work in building scalable systems, healthcare platforms, and innovative solutions
            that have made real-world impact across multiple industries.
          </p>
        </FadeInSection>
        <FadeInSection delay={0.1}>
          <ProjectGrid items={projectsData} />
        </FadeInSection>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <FadeInSection>
          <h2 className="text-4xl md:text-6xl font-bold text-theme mb-4">Latest Articles</h2>
          <p className="text-theme-secondary text-lg max-w-3xl mb-12">
            Technical deep-dives on backend engineering, system design, and modern development practices.
          </p>
        </FadeInSection>
        <FadeInSection delay={0.1}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                href: "/blog/india-first-ai-search-engine-fomoa",
                tag: "AI SEARCH",
                tagColor: "var(--accent)",
                title: "Why Indian Users Need an India-First AI Search Engine",
                description: "Generic AI models fail on Indian context - lakhs, crores, Hinglish, govt schemes. FOMOA is built for India."
              },
              {
                href: "/blog/database-connection-pooling-performance-guide",
                tag: "DATABASE",
                tagColor: "#22c55e",
                title: "Database Connection Pooling: The Performance Fix",
                description: "How I learned about connection pooling after our PostgreSQL database crashed under load."
              },
              {
                href: "/blog/ai-native-backend-architecture-2026",
                tag: "ARCHITECTURE",
                tagColor: "#a855f7",
                title: "Building AI-Native Backends: Architecture for 2026",
                description: "Complete guide to designing backend systems for AI agents - MCP protocol, vector databases, governance."
              }
            ].map((article) => (
              <a key={article.href} href={article.href} className="group">
                <div className="card p-6 h-full transition-all hover:shadow-theme-md" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-medium" style={{ color: article.tagColor }}>{article.tag}</span>
                  <h3 className="text-theme font-semibold mt-2 mb-3 group-hover:text-theme-accent transition-colors">{article.title}</h3>
                  <p className="text-theme-secondary text-sm">{article.description}</p>
                </div>
              </a>
            ))}
          </div>
        </FadeInSection>
        <FadeInSection delay={0.2}>
          <div className="text-center">
            <a href="/blog" className="inline-flex items-center gap-2 font-medium transition-colors" style={{ color: "var(--accent)" }}>
              View all articles
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </FadeInSection>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <FadeInSection>
          <div
            className="card p-12 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--surface), color-mix(in srgb, var(--surface) 50%, var(--background)))",
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent)" }} />

            <div className="text-center mb-12 relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold text-theme mb-6">Let&apos;s Connect</h2>
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto leading-relaxed">
                I&apos;m always interested in hearing about new projects and opportunities.
                Whether you have a question or just want to say hi, feel free to reach out!
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
              {[
                {
                  href: "mailto:tusharagrawal0104@gmail.com",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: "Email",
                  subtitle: "tusharagrawal0104@gmail.com"
                },
                {
                  href: "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
                  icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  ),
                  title: "LinkedIn",
                  subtitle: "Connect with me"
                },
                {
                  href: "https://github.com/Tushar010402",
                  icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  ),
                  title: "GitHub",
                  subtitle: "View my projects"
                }
              ].map((contact) => (
                <a
                  key={contact.title}
                  href={contact.href}
                  target={contact.href.startsWith("http") ? "_blank" : undefined}
                  rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group"
                >
                  <div className="card-elevated p-6 text-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-all group-hover:scale-110"
                      style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                    >
                      {contact.icon}
                    </div>
                    <h3 className="text-theme font-semibold mb-2">{contact.title}</h3>
                    <p className="text-theme-secondary text-sm">{contact.subtitle}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 justify-center relative z-10">
              <MagneticElement>
                <Button borderRadius="1.75rem" className="px-10 py-4 transition-theme" containerClassName="transition-theme">
                  <a href="/Tushar_Agrawal_Resume.pdf" download="Tushar_Agrawal_Resume.pdf" className="flex items-center gap-2 font-semibold text-theme">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Resume
                  </a>
                </Button>
              </MagneticElement>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* AI Chat FAB + Panel */}
      <AIChatFab onClick={() => { setChatTopic(undefined); setIsChatOpen(true); }} />
      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} topic={chatTopic} />

    </div>
  );
}

const skillsData = [
  {
    title: "Languages",
    description:
      "TypeScript, JavaScript, Python, Golang",
  },
  {
    title: "Frameworks",
    description:
      "Next.js, Django, Flask, Node.js, FastAPI, React.js",
  },
  {
    title: "Databases",
    description:
      "PostgreSQL, MongoDB, DynamoDB, Redis",
  },
  {
    title: "DevOps & Infrastructure",
    description:
      "Docker, Nginx/Apache, CI/CD Pipelines (Github Actions), Automated Database/RAM Optimization, Secure Cloud Storage",
  },
  {
    title: "Architecture",
    description:
      "Event-Driven Systems, Microservices, System Design, AI-Assisted Development (Claude Code, Cursor), LLMs",
  },
  {
    title: "Additional Skills",
    description:
      "REST APIs, GraphQL, WebSocket, HIPAA/DPDP Compliance, OCR, Load Balancing, Zero-Downtime Deployment",
  },
];

const projectsData = [
  {
    title: "LiquorPro",
    description:
      "Enterprise-grade inventory management platform serving 20+ businesses with 80+ users across Uttar Pradesh, revolutionizing liquor retail operations.",
    longDescription:
      "A comprehensive SaaS solution that transformed how liquor retailers manage inventory, sales, and compliance across multiple stores.",
    tech: ["Go", "Flutter", "Redis", "Kafka", "PostgreSQL", "Docker", "Microservices", "OCR", "REST API"],
    achievements: [
      "Reduced data entry time by 90% (45 minutes → 5 minutes) using AI-powered OCR",
      "Achieved sub-100ms response times with optimized Go microservices",
      "Serving 80+ users across 20+ businesses in Uttar Pradesh",
      "Built event-driven architecture with Kafka for real-time inventory updates",
      "Implemented Redis caching layer reducing database load by 70%"
    ],
    link: "https://floelife.in",
    github: "https://github.com/Tushar010402/Liqour_1.1",
    status: "Live" as const,
  },
  {
    title: "Laboratory Information Management System (LIMS)",
    description:
      "Enterprise healthcare system for Dr Dangs Lab managing 15+ departments, 500+ daily patients, and processing 1,000+ medical reports daily.",
    longDescription:
      "Comprehensive LIMS platform revolutionizing healthcare operations with automated report processing and real-time analytics.",
    tech: ["Django", "React.js", "Python", "PostgreSQL", "Redis", "OCR", "WebSocket", "Docker", "Nginx"],
    achievements: [
      "Reduced report processing time by 60% through automation",
      "Processing 1,000+ daily medical reports with 90% error reduction",
      "Serving 500+ daily patients across 15+ departments",
      "Built Python OCR system eliminating manual data entry errors",
      "Implemented real-time report delivery via WebSocket connections",
      "Achieved 99.9% uptime with zero-downtime deployment pipeline"
    ],
    link: "#",
    github: undefined,
    status: "Live" as const,
  },
  {
    title: "FloeMed",
    description:
      "Revolutionary healthcare blockchain platform with Apple Watch integration for secure, immutable medical records and real-time health monitoring.",
    longDescription:
      "Next-generation healthcare solution combining blockchain technology with wearable integration for secure patient data management.",
    tech: ["Flutter", "Blockchain", "HealthKit", "Dart", "Smart Contracts", "Apple Watch SDK", "Firebase"],
    achievements: [
      "Built immutable medical records system using blockchain technology",
      "Integrated Apple Watch for real-time health metrics synchronization",
      "Enabled secure patient analytics with end-to-end encryption",
      "Developed cross-platform mobile app using Flutter",
      "Implemented HealthKit integration for seamless data collection",
      "Created smart contracts for secure data sharing between healthcare providers"
    ],
    link: "#",
    github: "https://github.com/Tushar010402/Floemed",
    status: "Completed" as const,
  },
  {
    title: "Microservices Healthcare Platform",
    description:
      "Scalable Go/FastAPI microservices architecture handling 10,000+ monthly records with 99.9% uptime and HIPAA/DPDP compliance.",
    longDescription:
      "Enterprise-grade distributed system built for healthcare operations with focus on reliability, security, and compliance.",
    tech: ["Go", "FastAPI", "Python", "PostgreSQL", "Redis", "Docker", "Kubernetes", "GraphQL", "REST API", "WebSocket"],
    achievements: [
      "Handling 10,000+ monthly records with 99.9% uptime",
      "Achieved HIPAA/DPDP compliance for healthcare data",
      "Built API gateway handling 50,000+ daily requests at sub-100ms latency",
      "Implemented load balancing for high availability",
      "Reduced deployment time by 92% (4 hours → 20 minutes)",
      "Supports REST, GraphQL, and WebSocket protocols"
    ],
    link: "#",
    github: undefined,
    status: "Live" as const,
  },
];

const experienceData = [
  {
    title: "May 2023 – Present",
    content: (
      <div>
        <h3 className="text-theme text-xl md:text-3xl font-bold mb-4">
          Software Developer
        </h3>
        <p className="text-theme-secondary text-sm md:text-base mb-4">
          Dr Dangs Lab, New Delhi
        </p>
        <ul className="text-theme-secondary text-sm md:text-base list-disc list-inside space-y-2">
          <li>Built Laboratory Information Management System for 15+ departments serving 500+ daily patients, reducing report processing time by 60% (Django, React.js)</li>
          <li>Engineered Go/FastAPI microservices platform handling 10,000+ monthly records with 99.9% uptime and HIPAA/DPDP compliance</li>
          <li>Automated medical report extraction using Python OCR, processing 1,000+ daily reports and eliminating 90% of manual errors</li>
          <li>Designed API gateway with load balancing handling 50,000+ daily requests at sub-100ms latency (REST, GraphQL, WebSocket)</li>
          <li>Reduced deployment time by 92% (4 hours → 20 minutes) using Docker/Nginx pipeline enabling daily zero-downtime releases</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Feb 2023 – May 2023",
    content: (
      <div>
        <h3 className="text-theme text-xl md:text-3xl font-bold mb-4">
          Frontend Developer
        </h3>
        <p className="text-theme-secondary text-sm md:text-base mb-4">
          BeanByte Softwares, Jaipur
        </p>
        <ul className="text-theme-secondary text-sm md:text-base list-disc list-inside space-y-2">
          <li>Developed 10+ production web applications in React.js with pixel-perfect UI, increasing user engagement by 30%</li>
          <li>Translated design mockups into functional interfaces collaborating with cross-functional teams</li>
          <li>Optimized Redux and Context API implementation, reducing page load times by 25%</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Jun 2022 – Dec 2022",
    content: (
      <div>
        <h3 className="text-theme text-xl md:text-3xl font-bold mb-4">
          Frontend Developer Intern
        </h3>
        <p className="text-theme-secondary text-sm md:text-base mb-4">
          GoBOLT, Gurugram
        </p>
        <ul className="text-theme-secondary text-sm md:text-base list-disc list-inside space-y-2">
          <li>Built 5+ shipment tracking features in React.js, improving accuracy by 35% for 1,000+ daily users</li>
          <li>Integrated 8+ frontend components with backend APIs for authentication and data visualization</li>
          <li>Resolved 20+ UI bugs through code reviews and agile collaboration, improving stability by 40%</li>
        </ul>
      </div>
    ),
  },
];
