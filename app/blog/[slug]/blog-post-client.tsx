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
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { BlogReader } from '@/components/ui/blog-reader';

interface BlogPostClientProps {
  blog: Blog;
  comments?: never[];
  relatedBlogs: Blog[];
  allBlogs: Blog[];
}

export default function BlogPostClient({ blog, relatedBlogs, allBlogs }: BlogPostClientProps) {
  const [copied, setCopied] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Short date format for sidebar
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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

  // Simple markdown-to-HTML converter
  const renderMarkdown = (markdown: string) => {
    let html = markdown;

    // Helper to escape HTML entities in code blocks
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Phase 1: Extract code blocks and inline code, replace with placeholders
    // This prevents HTML in code examples from being parsed as live DOM elements
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
      const index = codeBlocks.length;
      codeBlocks.push(`<pre class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm text-neutral-300">${escapeHtml(code)}</code></pre>`);
      return `%%CODEBLOCK_${index}%%`;
    });

    const inlineCodeBlocks: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_match, code) => {
      const index = inlineCodeBlocks.length;
      inlineCodeBlocks.push(`<code class="bg-neutral-900 text-blue-400 px-2 py-1 rounded text-sm">${escapeHtml(code)}</code>`);
      return `%%INLINECODE_${index}%%`;
    });

    // Phase 2: Apply markdown transformations (code is safely extracted)
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-10 mb-6 text-white">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-12 mb-8 text-white">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 list-disc text-neutral-300">$1</li>');
    html = html.replace(/(<li class="ml-6 mb-2 list-disc text-neutral-300">.*<\/li>\n?)+/g, '<ul class="my-4">$&</ul>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p class="text-neutral-300 leading-relaxed mb-4">');
    html = `<p class="text-neutral-300 leading-relaxed mb-4">${html}</p>`;

    // Phase 3: Restore code blocks from placeholders
    codeBlocks.forEach((block, index) => {
      html = html.replace(`%%CODEBLOCK_${index}%%`, block);
    });
    inlineCodeBlocks.forEach((block, index) => {
      html = html.replace(`%%INLINECODE_${index}%%`, block);
    });

    return html;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-20">
        <div className="flex gap-8">
          {/* Sidebar - Left Navigation */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              {/* Back to Blog */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                All Articles
              </Link>

              {/* All Blogs List */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm text-white">All Articles</span>
                  <span className="ml-auto text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                    {allBlogs.length}
                  </span>
                </div>

                <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                  {allBlogs.map((post) => {
                    const isCurrentPost = post.slug === blog.slug;
                    return (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className={`block group ${isCurrentPost ? 'pointer-events-none' : ''}`}
                      >
                        <div
                          className={`p-2 rounded-lg transition-all ${
                            isCurrentPost
                              ? 'bg-blue-600/20 border border-blue-500/50'
                              : 'hover:bg-neutral-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {isCurrentPost && (
                              <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className={isCurrentPost ? '' : 'pl-6'}>
                              <h4
                                className={`text-sm font-medium line-clamp-2 ${
                                  isCurrentPost ? 'text-blue-400' : 'text-neutral-300 group-hover:text-white'
                                }`}
                              >
                                {post.title}
                              </h4>
                              <span className="text-xs text-neutral-500 mt-1 block">
                                {formatShortDate(post.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile Back Button */}
            <Link
              href="/blog"
              className="lg:hidden inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Blog
            </Link>

            {/* Article */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              {/* Featured Image */}
              {blog.image_url && (
                <div className="relative w-full h-80 md:h-96 mb-8 rounded-xl overflow-hidden">
                  <Image
                    src={blog.image_url}
                    alt={blog.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                {blog.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-neutral-400 mb-8 pb-8 border-b border-neutral-800">
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

              {/* Audio Reader */}
              <div className="mb-8">
                <BlogReader
                  title={blog.title}
                  content={blog.content}
                  description={blog.description}
                  author={blog.author || undefined}
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {blog.tags.split(',').map((tag, i) => (
                  <Link
                    key={i}
                    href={`/blog?tag=${encodeURIComponent(tag.trim())}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded-full hover:border-blue-500 transition-all"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag.trim()}
                  </Link>
                ))}
              </div>

              {/* Description */}
              <p className="text-lg md:text-xl text-neutral-300 mb-8 leading-relaxed">{blog.description}</p>

              {/* Content */}
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(blog.content) }}
              />

              {/* Social Sharing */}
              <div className="mt-12 pt-8 border-t border-neutral-800">
                <h3 className="text-lg font-semibold mb-4">Share this article</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={shareOnLinkedIn}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-sm"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </button>
                  <button
                    onClick={shareOnTwitter}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition-all text-sm"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-lg transition-all text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
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
                className="mt-16 pt-8 border-t border-neutral-800 max-w-3xl"
              >
                <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedBlogs.map((relatedBlog) => (
                    <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`}>
                      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-blue-500 transition-all h-full">
                        <h3 className="font-semibold text-white mb-2 line-clamp-2 text-sm">
                          {relatedBlog.title}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-2">{relatedBlog.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
