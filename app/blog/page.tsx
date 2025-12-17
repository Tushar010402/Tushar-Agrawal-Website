import { Metadata } from 'next';
import BlogListingClient from './blog-listing-client';
import { blogAPI } from '@/lib/api';
import { Blog } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Technical Blog - Tushar Agrawal',
  description: 'In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, Docker, DevOps, and backend engineering by Tushar Agrawal. Learn from real-world implementations and best practices.',
  keywords: [
    'Tushar Agrawal blog',
    'backend engineering blog',
    'microservices tutorial',
    'Python FastAPI',
    'Go programming',
    'healthcare SaaS',
    'HIPAA compliance',
    'Docker deployment',
    'system design',
    'event-driven architecture',
  ],
  openGraph: {
    title: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, and backend engineering.',
    type: 'website',
    url: 'https://yourdomain.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technical Blog - Tushar Agrawal',
    description: 'In-depth articles on microservices, Python, Go, FastAPI, and backend engineering.',
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Error Loading Blogs</h1>
          <p className="text-gray-400">{error}</p>
          <p className="text-gray-500 mt-2">
            Please ensure the backend API is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
          </p>
        </div>
      </div>
    );
  }

  return <BlogListingClient initialBlogs={initialBlogs} />;
}
