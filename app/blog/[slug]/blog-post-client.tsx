'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Blog } from '@/lib/types';
import {
  Calendar,
  Tag as TagIcon,
  ArrowLeft,
  Clock,
  User,
  Linkedin,
  Twitter,
  Copy,
  Check,
} from 'lucide-react';

interface BlogPostClientProps {
  blog: Blog;
  comments?: never[];
  relatedBlogs: Blog[];
}

export default function BlogPostClient({ blog, relatedBlogs }: BlogPostClientProps) {
  const [copied, setCopied] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate reading time
  const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  // Social sharing functions
  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(blog.title);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareOnTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${blog.title} by @TusharAgrawal`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-to-HTML converter (basic implementation)
  const renderMarkdown = (markdown: string) => {
    // This is a simplified markdown renderer
    // For production, consider using a library like react-markdown or marked
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-10 mb-6 text-white">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-12 mb-8 text-white">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm text-gray-300">$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-900 text-blue-400 px-2 py-1 rounded text-sm">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 list-disc text-gray-300">$1</li>');
    html = html.replace(/(<li class="ml-6 mb-2 list-disc text-gray-300">.*<\/li>\n?)+/g, '<ul class="my-4">$&</ul>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p class="text-gray-300 leading-relaxed mb-4">');
    html = `<p class="text-gray-300 leading-relaxed mb-4">${html}</p>`;

    return html;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Featured Image */}
          {blog.image_url && (
            <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden">
              <Image
                src={blog.image_url}
                alt={blog.title}
                fill
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            {blog.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-8 pb-8 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(blog.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {calculateReadingTime(blog.content)}
            </div>
            {blog.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {blog.author}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {blog.tags.split(',').map((tag, i) => (
              <Link
                key={i}
                href={`/blog?tag=${encodeURIComponent(tag.trim())}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-900 border border-neutral-800 text-gray-300 text-sm rounded-full hover:border-blue-500 transition-all"
              >
                <TagIcon className="w-3 h-3" />
                {tag.trim()}
              </Link>
            ))}
          </div>

          {/* Description */}
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">{blog.description}</p>

          {/* Content */}
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(blog.content) }}
          />

          {/* Social Sharing */}
          <div className="mt-12 pt-8 border-t border-neutral-800">
            <h3 className="text-lg font-semibold mb-4">Share this article</h3>
            <div className="flex gap-4">
              <button
                onClick={shareOnLinkedIn}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
              >
                <Linkedin className="w-5 h-5" />
                LinkedIn
              </button>
              <button
                onClick={shareOnTwitter}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition-all"
              >
                <Twitter className="w-5 h-5" />
                Twitter
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </motion.article>

        {/* Related Posts */}
        {relatedBlogs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 pt-8 border-t border-neutral-800"
          >
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map((relatedBlog) => (
                <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`}>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-blue-500 transition-all">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {relatedBlog.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{relatedBlog.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </div>
  );
}
