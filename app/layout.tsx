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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in'),
  verification: {
    google: 'QgpuL3dlMJxrVaZQ0j1KMx1cB3zVdoxU8lShWYEDc1s',
  },
  title: "Tushar Agrawal - Backend Engineer | Full-Stack Developer",
  description: "Backend Engineer with 3 years of experience building scalable healthcare SaaS platforms. Expertise in Python, Go, TypeScript, React, Next.js, Django, FastAPI, PostgreSQL, Redis, Docker, Nginx, and microservices architecture. Specialized in HIPAA-compliant systems, distributed systems, and AI automation.",
  keywords: ["Tushar Agrawal", "Backend Engineer", "Full Stack Developer", "Python Developer", "Go Developer", "TypeScript Developer", "React Developer", "Next.js", "Django", "FastAPI", "PostgreSQL", "Redis", "Docker", "Nginx", "Microservices", "Healthcare SaaS", "HIPAA Compliance", "Distributed Systems", "AI Automation"],
  authors: [{ name: "Tushar Agrawal", url: "https://github.com/Tushar010402" }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Tushar Agrawal - Backend Engineer | Full-Stack Developer",
    description: "Backend Engineer with 3 years building scalable healthcare SaaS platforms. Expertise in Python, Go, TypeScript, and modern web technologies.",
    type: "website",
    locale: "en_US",
    url: '/',
    siteName: 'Tushar Agrawal',
  },
  twitter: {
    card: "summary_large_image",
    title: "Tushar Agrawal - Backend Engineer",
    description: "Backend Engineer with 3 years building scalable healthcare SaaS platforms.",
    creator: "@TusharAgrawal",
  },
  other: {
    'author': 'Tushar Agrawal',
    'designer': 'Tushar Agrawal',
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tusharagrawal.in";

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: "Tushar Agrawal",
    givenName: "Tushar",
    familyName: "Agrawal",
    alternateName: ["Tushar Agrawal Backend Developer", "Tushar Agrawal Software Engineer"],
    jobTitle: "Backend Engineer",
    description: "Tushar Agrawal is a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms, microservices, and event-driven architectures. Expert in Python, Go, FastAPI, Django, PostgreSQL, Redis, Docker, and cloud technologies.",
    url: siteUrl,
    image: `${siteUrl}/android-chrome-512x512.png`,
    email: "tusharagrawal0104@gmail.com",
    telephone: "+91-8126816664",
    nationality: {
      "@type": "Country",
      name: "India",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "New Delhi",
      addressCountry: "IN",
    },
    sameAs: [
      "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
      "https://github.com/Tushar010402",
      "https://twitter.com/TusharAgrawal",
    ],
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "GD Goenka University",
      sameAs: "https://www.gdgoenkauniversity.com/",
    },
    hasOccupation: {
      "@type": "Occupation",
      name: "Backend Engineer",
      occupationLocation: {
        "@type": "City",
        name: "New Delhi",
      },
      estimatedSalary: {
        "@type": "MonetaryAmountDistribution",
        currency: "INR",
        duration: "P1Y",
      },
      skills: "Python, Go, FastAPI, Django, PostgreSQL, Redis, Docker, Kubernetes, AWS, Microservices",
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
      url: "https://drdangslab.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "New Delhi",
        addressCountry: "IN",
      },
    },
    memberOf: [
      {
        "@type": "ProfessionalService",
        name: "Software Development Community",
      },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tushar Agrawal",
    description: "Personal portfolio and technical blog of Tushar Agrawal - Backend Engineer specializing in Python, Go, TypeScript, and distributed systems.",
    url: siteUrl,
    author: {
      "@type": "Person",
      name: "Tushar Agrawal",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tushar Agrawal",
    url: siteUrl,
    logo: `${siteUrl}/android-chrome-512x512.png`,
    sameAs: [
      "https://www.linkedin.com/in/tushar-agrawal-91b67a28a",
      "https://github.com/Tushar010402",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "tusharagrawal0104@gmail.com",
      telephone: "+91-8126816664",
      contactType: "customer service",
    },
  };

  // ProfilePage schema for better AI visibility
  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${siteUrl}/#profilepage`,
    name: "Tushar Agrawal - Backend Engineer Portfolio",
    description: "Official portfolio and technical blog of Tushar Agrawal, a Backend Engineer specializing in Python, Go, microservices, and healthcare SaaS platforms.",
    url: siteUrl,
    mainEntity: {
      "@id": `${siteUrl}/#person`,
    },
    dateCreated: "2024-01-01T00:00:00+05:30",
    dateModified: "2026-01-16T00:00:00+05:30",
  };

  return (
    <html lang="en">
      <head>
        {/* Favicon configuration - 48x48 required for Google Search results */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#6366f1" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageSchema) }}
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
