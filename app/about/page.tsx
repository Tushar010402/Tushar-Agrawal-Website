import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";

export const metadata: Metadata = {
  title: "About Tushar Agrawal - Backend Engineer | Software Developer India",
  description: "Tushar Agrawal is a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms. Expert in Python, Go, FastAPI, Django, microservices, Docker, and AWS. Based in New Delhi, India.",
  keywords: ["Tushar Agrawal", "Backend Engineer", "Software Developer", "Python Developer", "Go Developer", "New Delhi", "India", "Healthcare SaaS", "Microservices"],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Tushar Agrawal - Backend Engineer",
    description: "Backend Engineer with 3+ years building scalable healthcare SaaS platforms. Expert in Python, Go, FastAPI, and microservices.",
    type: "profile",
    url: "/about",
  },
};

export default function AboutPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusharagrawal.in";

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Tushar Agrawal",
    description: "Learn about Tushar Agrawal, a Backend Engineer specializing in Python, Go, and healthcare SaaS platforms.",
    url: `${siteUrl}/about`,
    mainEntity: {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: "Tushar Agrawal",
      jobTitle: "Backend Engineer",
      description: "Tushar Agrawal is a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms, microservices, and event-driven architectures.",
      image: `${siteUrl}/android-chrome-512x512.png`,
      url: siteUrl,
      sameAs: [
        "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
        "https://github.com/Tushar010402",
      ],
    },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">

        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            About Tushar Agrawal
          </h1>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Who is Tushar Agrawal?</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              <strong>Tushar Agrawal</strong> is a <strong>Backend Engineer</strong> based in <strong>New Delhi, India</strong> with over 3 years of professional experience building scalable software systems. He specializes in <strong>Python, Go, FastAPI, Django, microservices architecture</strong>, and <strong>healthcare SaaS platforms</strong>.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed mt-4">
              Currently, Tushar works as a <strong>Software Developer at Dr. Dangs Lab</strong>, one of India&apos;s leading pathology laboratories, where he builds <strong>HIPAA-compliant Laboratory Information Management Systems (LIMS)</strong> serving 500+ daily patients across 15+ departments.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Technical Expertise</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Tushar Agrawal&apos;s technical stack includes:
            </p>
            <ul className="text-gray-300 text-lg space-y-2 mt-4">
              <li><strong>Languages:</strong> Python, Go, TypeScript, JavaScript</li>
              <li><strong>Backend Frameworks:</strong> FastAPI, Django, Flask, Node.js</li>
              <li><strong>Frontend:</strong> React.js, Next.js</li>
              <li><strong>Databases:</strong> PostgreSQL, MongoDB, Redis, DynamoDB</li>
              <li><strong>Message Queues:</strong> Apache Kafka, RabbitMQ</li>
              <li><strong>DevOps:</strong> Docker, Kubernetes, Nginx, CI/CD, AWS</li>
              <li><strong>Architecture:</strong> Microservices, Event-Driven Systems, REST APIs, GraphQL</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Professional Experience</h2>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white">Software Developer at Dr. Dangs Lab</h3>
              <p className="text-gray-400 mt-1">May 2023 - Present | New Delhi, India</p>
              <ul className="text-gray-300 mt-4 space-y-2">
                <li>Built LIMS for 15+ departments serving 500+ daily patients</li>
                <li>Engineered Go/FastAPI microservices with 99.9% uptime</li>
                <li>Automated medical report extraction using Python OCR (1,000+ daily reports)</li>
                <li>Designed API gateway handling 50,000+ daily requests at sub-100ms latency</li>
              </ul>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white">Frontend Developer at BeanByte Softwares</h3>
              <p className="text-gray-400 mt-1">Feb 2023 - May 2023 | Jaipur, India</p>
              <ul className="text-gray-300 mt-4 space-y-2">
                <li>Developed 10+ production React.js applications</li>
                <li>Optimized Redux implementation, reducing page load times by 25%</li>
              </ul>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white">Frontend Developer Intern at GoBOLT</h3>
              <p className="text-gray-400 mt-1">Jun 2022 - Dec 2022 | Gurugram, India</p>
              <ul className="text-gray-300 mt-4 space-y-2">
                <li>Built shipment tracking features for 1,000+ daily users</li>
                <li>Integrated frontend components with backend APIs</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Notable Projects</h2>

            <div className="grid gap-6">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white">LiquorPro</h3>
                <p className="text-gray-300 mt-2">Enterprise inventory management platform serving 20+ businesses with 80+ users across Uttar Pradesh. Built with Go, Flutter, Redis, Kafka, and PostgreSQL.</p>
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white">FOMOA - India-First AI Search</h3>
                <p className="text-gray-300 mt-2">AI search engine optimized for Indian context with Hindi/Hinglish support, trained on 86,000+ samples from 150+ authoritative Indian sources.</p>
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white">Dr. Dangs Lab LIMS</h3>
                <p className="text-gray-300 mt-2">HIPAA-compliant Laboratory Information Management System processing 10,000+ monthly medical records with real-time reporting and OCR automation.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Education</h2>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white">GD Goenka University</h3>
              <p className="text-gray-400 mt-1">B.Tech in Computer Science | 2019 - 2023</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Contact Tushar Agrawal</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <a href="mailto:tusharagrawal0104@gmail.com" className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-300">tusharagrawal0104@gmail.com</span>
              </a>

              <a href="tel:+918126816664" className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-300">+91-8126816664</span>
              </a>

              <a href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-gray-300">LinkedIn Profile</span>
              </a>

              <a href="https://github.com/Tushar010402" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-gray-300">GitHub Profile</span>
              </a>
            </div>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-neutral-800">
          <p className="text-gray-500 text-center">
            Last updated: January 2026 | <Link href="/blog" className="text-blue-400 hover:underline">Read my technical blog</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
