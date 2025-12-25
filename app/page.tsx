"use client";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { ProjectGrid } from "@/components/ui/project-card";
import { Timeline } from "@/components/ui/timeline";
import { Button } from "@/components/ui/moving-border";
import { motion } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight";
import { Navbar } from "@/components/ui/navbar";

export default function Home() {
  return (
    <div className="w-full bg-black">
      <Navbar />

      {/* Hero Section */}
      <section id="home">
        <HeroHighlight containerClassName="pt-20">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: [20, -5, 0],
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="text-2xl px-4 md:text-4xl lg:text-5xl font-bold text-white max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto"
        >
          Hi, I&apos;m{" "}
          <Highlight className="text-white">
            Tushar Agrawal
          </Highlight>
          <div className="mt-8">
            <TextGenerateEffect
              words="Backend Engineer | 3+ YOE | Distributed Systems, Python, TypeScript, Apache & Nginx, PostgreSQL"
              className="text-xl md:text-2xl"
            />
          </div>
        </motion.div>
        </HeroHighlight>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-12">
          About Me
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 hover:border-neutral-700 transition-all">
            <h3 className="text-2xl font-bold text-white mb-4">Professional Background</h3>
            <p className="text-neutral-300 text-base leading-relaxed">
              Full-Stack Developer with 3 years building scalable healthcare SaaS platforms serving 80+ users across 20+ businesses.
              Reduced operational costs by 90% through microservices architecture and AI automation. Collaborated with cross-functional
              teams and third-party vendors to deliver integrated solutions.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 hover:border-neutral-700 transition-all">
            <h3 className="text-2xl font-bold text-white mb-4">Technical Expertise</h3>
            <p className="text-neutral-300 text-base leading-relaxed">
              Proficient in Python, Go, React, and Next.js with hands-on experience in HIPAA-compliant systems and cloud deployment.
              Specialized in building high-performance distributed systems with event-driven architecture and microservices.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400">3+</div>
            <div className="text-sm text-neutral-400 mt-2">Years Experience</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400">80+</div>
            <div className="text-sm text-neutral-400 mt-2">Active Users</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-400">20+</div>
            <div className="text-sm text-neutral-400 mt-2">Businesses Served</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-orange-400">99.9%</div>
            <div className="text-sm text-neutral-400 mt-2">System Uptime</div>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button
            borderRadius="1.75rem"
            className="bg-slate-900 text-white border-slate-800 px-8 py-4"
          >
            <a href="/Tushar_Agrawal_Resume.pdf" download="Tushar_Agrawal_Resume.pdf" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Resume
            </a>
          </Button>
          <Button
            borderRadius="1.75rem"
            className="bg-slate-900 text-white border-slate-800 px-8 py-4"
          >
            <a href="tel:+918126816664" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +91-8126816664
            </a>
          </Button>
          <Button
            borderRadius="1.75rem"
            className="bg-slate-900 text-white border-slate-800 px-8 py-4"
          >
            <a href="mailto:tusharagrawal0104@gmail.com" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Me
            </a>
          </Button>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Skills & Technologies
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            Comprehensive technical expertise across full-stack development, cloud infrastructure, and modern architecture patterns.
          </p>
        </div>
        <HoverEffect items={skillsData} />
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-20">
        <Timeline data={experienceData} />
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Featured Projects
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            A showcase of my work in building scalable systems, healthcare platforms, and innovative solutions
            that have made real-world impact across multiple industries.
          </p>
        </div>
        <ProjectGrid items={projectsData} />
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-800 rounded-3xl p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Let&apos;s Connect
            </h2>
            <p className="text-neutral-300 text-lg max-w-2xl mx-auto leading-relaxed">
              I&apos;m always interested in hearing about new projects and opportunities.
              Whether you have a question or just want to say hi, feel free to reach out!
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <a href="mailto:tusharagrawal0104@gmail.com" className="group">
              <div className="bg-neutral-900/80 border border-neutral-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:scale-105">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-all">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Email</h3>
                <p className="text-neutral-400 text-sm">tusharagrawal0104@gmail.com</p>
              </div>
            </a>

            <a href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-neutral-900/80 border border-neutral-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:scale-105">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-all">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">LinkedIn</h3>
                <p className="text-neutral-400 text-sm">Connect with me</p>
              </div>
            </a>

            <a href="https://github.com/Tushar010402" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-neutral-900/80 border border-neutral-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:scale-105">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-all">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">GitHub</h3>
                <p className="text-neutral-400 text-sm">View my projects</p>
              </div>
            </a>
          </div>

          {/* Alternative Contact Methods */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              borderRadius="1.75rem"
              className="bg-slate-900 text-white border-slate-700 px-10 py-4"
            >
              <a href="/Tushar_Agrawal_Resume.pdf" download="Tushar_Agrawal_Resume.pdf" className="flex items-center gap-2 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Resume
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto text-center text-neutral-400">
          <p>© 2025 Tushar Agrawal. Built with Next.js and Aceternity UI</p>
          <p className="mt-2 text-sm">Backend Engineer | Full-Stack Developer | B.Tech Computer Science, GD Goenka University (2019-2023)</p>
        </div>
      </footer>
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
        <h3 className="text-white text-xl md:text-3xl font-bold mb-4">
          Software Developer
        </h3>
        <p className="text-neutral-300 text-sm md:text-base mb-4">
          Dr Dangs Lab, New Delhi
        </p>
        <ul className="text-neutral-400 text-sm md:text-base list-disc list-inside space-y-2">
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
        <h3 className="text-white text-xl md:text-3xl font-bold mb-4">
          Frontend Developer
        </h3>
        <p className="text-neutral-300 text-sm md:text-base mb-4">
          BeanByte Softwares, Jaipur
        </p>
        <ul className="text-neutral-400 text-sm md:text-base list-disc list-inside space-y-2">
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
        <h3 className="text-white text-xl md:text-3xl font-bold mb-4">
          Frontend Developer Intern
        </h3>
        <p className="text-neutral-300 text-sm md:text-base mb-4">
          GoBOLT, Gurugram
        </p>
        <ul className="text-neutral-400 text-sm md:text-base list-disc list-inside space-y-2">
          <li>Built 5+ shipment tracking features in React.js, improving accuracy by 35% for 1,000+ daily users</li>
          <li>Integrated 8+ frontend components with backend APIs for authentication and data visualization</li>
          <li>Resolved 20+ UI bugs through code reviews and agile collaboration, improving stability by 40%</li>
        </ul>
      </div>
    ),
  },
];
