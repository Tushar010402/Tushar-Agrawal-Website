import { Metadata } from 'next';
import BlogListingClient from './blog-listing-client';
import { getAllPosts } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

export const metadata: Metadata = {
  title: 'Technical Blog - Tushar Agrawal | Backend Engineering, System Design & DevOps',
  description: 'In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, Docker, Kubernetes, AWS, PostgreSQL, Redis, and backend engineering by Tushar Agrawal. Learn from real-world implementations at Dr Dangs Lab, system design patterns, and best practices for building scalable applications.',
  keywords: [
    'Tushar Agrawal blog',
    'backend engineering blog',
    'microservices tutorial',
    'Python FastAPI tutorial',
    'Go programming guide',
    'healthcare SaaS development',
    'HIPAA compliance guide',
    'Docker deployment tutorial',
    'Kubernetes tutorial',
    'AWS services guide',
    'system design patterns',
    'event-driven architecture',
    'distributed systems',
    'API development',
    'software engineering blog',
    'tech blog India',
    'Dr Dangs Lab technology',
    'pathology lab software',
    'LIMS system',
    'JWT authentication',
    'OAuth implementation',
    'WebSocket real-time',
    'TypeScript best practices',
    'PostgreSQL optimization',
    'Redis caching',
    'Nginx configuration',
    'CI/CD pipeline',
    'testing strategies',
  ],
  alternates: {
    canonical: `${siteUrl}/blog`,
    types: {
      'application/rss+xml': `${siteUrl}/rss.xml`,
    },
  },
  openGraph: {
    title: 'Technical Blog - Tushar Agrawal | Backend Engineering & System Design',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, AWS, Docker, and backend engineering. Learn from real-world implementations at Dr Dangs Lab.',
    type: 'website',
    url: `${siteUrl}/blog`,
    siteName: 'Tushar Agrawal',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, AWS, Docker, and backend engineering best practices.',
    creator: '@TusharAgrawal',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  // JSON-LD Schema for Blog Listing (CollectionPage)
  const blogListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, Docker, Kubernetes, and backend engineering.',
    url: `${siteUrl}/blog`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Tushar Agrawal',
      url: siteUrl,
    },
    about: {
      '@type': 'Thing',
      name: 'Backend Engineering',
    },
    author: {
      '@type': 'Person',
      name: 'Tushar Agrawal',
      url: siteUrl,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 10).map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          url: `${siteUrl}/blog/${post.slug}`,
          datePublished: post.date,
          author: {
            '@type': 'Person',
            name: 'Tushar Agrawal',
          },
          image: post.image || `${siteUrl}/android-chrome-512x512.png`,
        },
      })),
    },
  };

  // Breadcrumb schema for blog listing
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteUrl}/blog`,
      },
    ],
  };

  if (posts.length === 0) {
    return (
      <div className="min-h-screen py-20 px-4" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Technical Blog
          </h1>
          <p className="text-theme-secondary text-lg mb-8">
            In-depth articles on microservices, backend engineering, Python, Go, FastAPI, and real-world system design
          </p>
          <div className="rounded-xl p-8 md:p-12" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl md:text-3xl font-bold text-theme mb-4">
              Coming Soon
            </h2>
            <p className="text-theme-secondary text-lg mb-6">
              I&apos;m working on some exciting technical content about backend engineering,
              system design, and building scalable applications. Stay tuned!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all text-white font-medium"
                style={{ background: "var(--accent)" }}
              >
                Follow on LinkedIn
              </a>
              <a
                href="https://github.com/Tushar010402"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all text-theme font-medium"
                style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}
              >
                View GitHub
              </a>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <div className="rounded-lg p-6" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-theme mb-2">Backend Engineering</h3>
              <p className="text-theme-secondary text-sm">Deep dives into Python, Go, FastAPI, Django, and microservices architecture.</p>
            </div>
            <div className="rounded-lg p-6" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-3">🏗️</div>
              <h3 className="text-lg font-semibold text-theme mb-2">System Design</h3>
              <p className="text-theme-secondary text-sm">Real-world patterns for building scalable, distributed systems.</p>
            </div>
            <div className="rounded-lg p-6" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-3">🏥</div>
              <h3 className="text-lg font-semibold text-theme mb-2">Healthcare SaaS</h3>
              <p className="text-theme-secondary text-sm">HIPAA compliance, medical data handling, and healthcare tech.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform posts to match BlogListingClient expected format
  const blogs = posts.map((post, index) => ({
    id: index + 1,
    slug: post.slug,
    title: post.title,
    description: post.description,
    content: '', // Content not needed for listing
    author: post.author,
    tags: post.tags.join(', '),
    image_url: post.image || '',
    published: post.published,
    views: 0,
    created_at: post.date,
    updated_at: post.updated || post.date,
    readingTime: post.readingTime,
  }));

  return (
    <>
      {/* JSON-LD Structured Data for Blog Listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogListingClient initialBlogs={blogs} />

      {/* Server-rendered links to ALL posts for SEO crawling */}
      <nav className="max-w-7xl mx-auto px-4 py-8" style={{ borderTop: "1px solid var(--border)" }} aria-label="All blog posts">
        <h2 className="text-xl font-semibold text-theme mb-4">All Articles</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {posts.map((post) => (
            <li key={post.slug}>
              <a
                href={`/blog/${post.slug}`}
                className="text-theme-secondary hover:text-theme-accent transition-colors line-clamp-1"
              >
                {post.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
