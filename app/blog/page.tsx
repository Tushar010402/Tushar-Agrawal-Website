import { Metadata } from 'next';
import BlogListingClient from './blog-listing-client';
import { blogAPI } from '@/lib/api';
import { Blog } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

export const metadata: Metadata = {
  title: 'Technical Blog - Tushar Agrawal | Backend Engineering & System Design',
  description: 'In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, Docker, DevOps, and backend engineering by Tushar Agrawal. Learn from real-world implementations, system design patterns, and best practices for building scalable applications.',
  keywords: [
    'Tushar Agrawal blog',
    'backend engineering blog',
    'microservices tutorial',
    'Python FastAPI tutorial',
    'Go programming guide',
    'healthcare SaaS development',
    'HIPAA compliance guide',
    'Docker deployment tutorial',
    'system design patterns',
    'event-driven architecture',
    'distributed systems',
    'API development',
    'software engineering blog',
    'tech blog India',
  ],
  alternates: {
    canonical: `${siteUrl}/blog`,
    types: {
      'application/rss+xml': `${siteUrl}/rss.xml`,
    },
  },
  openGraph: {
    title: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, and backend engineering. Learn from real-world implementations.',
    type: 'website',
    url: `${siteUrl}/blog`,
    siteName: 'Tushar Agrawal',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, and backend engineering.',
    creator: '@TusharAgrawal',
  },
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogPage() {
  // Fetch blogs server-side for SEO and initial render
  let initialBlogs: Blog[] = [];
  let error: string | null = null;

  try {
    initialBlogs = await blogAPI.getAll();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load blogs';
    console.error('Error fetching blogs:', err);
  }

  if (error || initialBlogs.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            Technical Blog
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            In-depth articles on microservices, backend engineering, Python, Go, FastAPI, and real-world system design
          </p>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 md:p-12">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Coming Soon
            </h2>
            <p className="text-gray-400 text-lg mb-6">
              I&apos;m working on some exciting technical content about backend engineering,
              system design, and building scalable applications. Stay tuned!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-white font-medium"
              >
                Follow on LinkedIn
              </a>
              <a
                href="https://github.com/Tushar010402"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-all text-white font-medium"
              >
                View GitHub
              </a>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">Backend Engineering</h3>
              <p className="text-gray-400 text-sm">Deep dives into Python, Go, FastAPI, Django, and microservices architecture.</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
              <div className="text-2xl mb-3">🏗️</div>
              <h3 className="text-lg font-semibold text-white mb-2">System Design</h3>
              <p className="text-gray-400 text-sm">Real-world patterns for building scalable, distributed systems.</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
              <div className="text-2xl mb-3">🏥</div>
              <h3 className="text-lg font-semibold text-white mb-2">Healthcare SaaS</h3>
              <p className="text-gray-400 text-sm">HIPAA compliance, medical data handling, and healthcare tech.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <BlogListingClient initialBlogs={initialBlogs} />;
}
