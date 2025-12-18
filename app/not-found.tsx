import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Page Not Found | Tushar Agrawal',
  description: 'The page you are looking for does not exist. Browse our technical blog or return to the homepage.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <span className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            404
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-white font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-all text-white font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            Browse Blog
          </Link>
        </div>

        {/* Popular Links */}
        <div className="border-t border-neutral-800 pt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Popular Pages
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/#about"
              className="px-4 py-2 text-sm bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
            >
              About Me
            </Link>
            <Link
              href="/#projects"
              className="px-4 py-2 text-sm bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/#experience"
              className="px-4 py-2 text-sm bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
            >
              Experience
            </Link>
            <Link
              href="/#contact"
              className="px-4 py-2 text-sm bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
