import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'),
  verification: {
    google: 'QgpuL3dlMJxrVaZQ0j1KMx1cB3zVdoxU8lShWYEDc1s',
  },
  title: "Tushar Agrawal - Backend Engineer | Full-Stack Developer",
  description: "Backend Engineer with 3 years of experience building scalable healthcare SaaS platforms. Expertise in Python, Go, TypeScript, React, Next.js, Django, FastAPI, PostgreSQL, Redis, Docker, Nginx, and microservices architecture. Specialized in HIPAA-compliant systems, distributed systems, and AI automation.",
  keywords: ["Tushar Agrawal", "Backend Engineer", "Full Stack Developer", "Python Developer", "Go Developer", "TypeScript Developer", "React Developer", "Next.js", "Django", "FastAPI", "PostgreSQL", "Redis", "Docker", "Nginx", "Microservices", "Healthcare SaaS", "HIPAA Compliance", "Distributed Systems", "AI Automation"],
  authors: [{ name: "Tushar Agrawal", url: "https://github.com/Tushar010402" }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icon.svg', color: '#6366f1' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Tushar Agrawal - Backend Engineer | Full-Stack Developer",
    description: "Backend Engineer with 3 years building scalable healthcare SaaS platforms. Expertise in Python, Go, TypeScript, and modern web technologies.",
    type: "website",
    locale: "en_US",
    url: '/',
  },
  twitter: {
    card: "summary_large_image",
    title: "Tushar Agrawal - Backend Engineer",
    description: "Backend Engineer with 3 years building scalable healthcare SaaS platforms.",
    creator: "@TusharAgrawal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Tushar Agrawal",
    jobTitle: "Backend Engineer",
    description: "Backend Engineer with 3 years of experience building scalable healthcare SaaS platforms, microservices, and event-driven architectures using Python, Go, FastAPI, Django, and modern DevOps practices.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003",
    email: "tusharagrawal0104@gmail.com",
    telephone: "+91-8126816664",
    sameAs: [
      "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
      "https://github.com/Tushar010402",
    ],
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "SRM University",
      sameAs: "https://www.srmist.edu.in/",
    },
    knowsAbout: [
      "Backend Engineering",
      "Python",
      "Go",
      "FastAPI",
      "Django",
      "Microservices Architecture",
      "Healthcare SaaS",
      "HIPAA Compliance",
      "Event-Driven Architecture",
      "Apache Kafka",
      "Docker",
      "PostgreSQL",
      "Redis",
      "System Design",
      "Next.js",
      "React",
      "TypeScript",
      "REST APIs",
      "Nginx",
      "DevOps",
      "CI/CD",
      "AWS",
    ],
    worksFor: {
      "@type": "Organization",
      name: "Dr. Dangs Lab",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
