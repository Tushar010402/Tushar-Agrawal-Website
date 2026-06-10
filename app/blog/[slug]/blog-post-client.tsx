'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { PostDiscussion } from '@/components/ui/post-discussion';

interface BlogPostClientProps {
  blog: Blog;
  comments?: never[];
  relatedBlogs: Blog[];
  allBlogs: Blog[];
  /** Tag slugs that have a hub page — only these get linked (non-hub tag URLs redirect). */
  tagHubSlugs?: string[];
  /** Pre-generated neural narration (from public/audio/manifest.json), if available. */
  audio?: { file: string; duration?: number; captions?: string } | null;
}

export default function BlogPostClient({ blog, relatedBlogs, allBlogs, tagHubSlugs = [], audio }: BlogPostClientProps) {
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

  return (
    <div className="min-h-screen text-theme" style={{ background: "var(--background)" }}>
      <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-20">
        <div className="flex gap-8">
          {/* Sidebar - Left Navigation */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              {/* Back to Blog */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                All Articles
              </Link>

              {/* All Blogs List */}
              <div className="rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <BookOpen className="w-4 h-4 text-theme-accent" />
                  <span className="font-semibold text-sm text-theme">All Articles</span>
                  <span className="ml-auto text-xs text-theme-secondary px-2 py-0.5 rounded-full" style={{ background: "var(--surface)" }}>
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
                              ? 'border'
                              : 'hover:bg-opacity-50'
                          }`}
                          style={!isCurrentPost ? { background: "transparent" } : {}}
                          onMouseEnter={(e) => !isCurrentPost && (e.currentTarget.style.background = "color-mix(in srgb, var(--surface) 50%, transparent)")}
                          onMouseLeave={(e) => !isCurrentPost && (e.currentTarget.style.background = "transparent")}
                        >
                          <div className="flex items-start gap-2">
                            {isCurrentPost && (
                              <ChevronRight className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                            )}
                            <div className={isCurrentPost ? '' : 'pl-6'}>
                              <h4
                                className={`text-sm font-medium line-clamp-2 ${
                                  isCurrentPost ? 'text-theme-accent' : 'text-theme-secondary group-hover:text-theme'
                                }`}
                              >
                                {post.title}
                              </h4>
                              <span className="text-xs text-theme-secondary mt-1 block">
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
              className="lg:hidden inline-flex items-center gap-2 text-theme-secondary hover:text-theme transition-colors mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Blog
            </Link>

            {/* Article */}
            <article className="clay-rise max-w-3xl">
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
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-theme"
                style={{ fontFamily: "var(--font-display), var(--font-geist-sans), system-ui, sans-serif", letterSpacing: "-0.02em", lineHeight: 1.05 }}
              >
                {blog.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-theme-secondary mb-8 pb-8" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(blog.created_at)}
                </div>
                {blog.updated_at && blog.updated_at !== blog.created_at && (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-theme-accent" />
                    Updated {formatDate(blog.updated_at)}
                  </div>
                )}
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
                  audioUrl={audio?.file}
                  audioDuration={audio?.duration}
                  captionsUrl={audio?.captions}
                />
              </div>

              {/* Tags — only hub tags link out; thin tags render as plain chips so
                  crawlers never discover below-threshold tag URLs */}
              <div className="flex flex-wrap gap-2 mb-8">
                {blog.tags.split(',').map((tag, i) => {
                  const slug = tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  const chipStyle = { background: "var(--surface)", border: "1px solid var(--border)" };
                  if (!tagHubSlugs.includes(slug)) {
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 text-theme-secondary text-sm rounded-full"
                        style={chipStyle}
                      >
                        <TagIcon className="w-3 h-3" />
                        {tag.trim()}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={i}
                      href={`/blog/tag/${slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1 text-theme-secondary text-sm rounded-full hover:border-[--accent-muted] transition-all"
                      style={chipStyle}
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag.trim()}
                    </Link>
                  );
                })}
              </div>

              {/* TL;DR — explicit summary block (also aids AI answer extraction) */}
              <div
                className="mb-10 rounded-xl p-5 md:p-6"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--accent)",
                }}
              >
                <p className="clay-eyebrow mb-2">TL;DR</p>
                <p className="text-base md:text-lg text-theme-secondary leading-relaxed m-0">
                  {blog.description}
                </p>
              </div>

              {/* Content */}
              <div
                className="prose clay-prose max-w-none"
                style={{ color: "var(--text-secondary)" }}
                dangerouslySetInnerHTML={{ __html: blog.contentHtml ?? '' }}
              />

              {/* Social Sharing */}
              <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
                <h3 className="text-lg font-semibold mb-4 text-theme">Share this article</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={shareOnLinkedIn}
                    className="flex items-center gap-2 px-4 py-2 bg-[--accent] hover:opacity-90 rounded-lg transition-all text-sm text-white"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </button>
                  <button
                    onClick={shareOnTwitter}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition-all text-sm text-white"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm text-theme"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </article>

            {/* Author bio — visible E-E-A-T signal tied to the Person entity */}
            <section
              className="mt-12 max-w-3xl rounded-xl p-6 md:p-7 flex flex-col sm:flex-row gap-5 items-start"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold"
                style={{ background: "var(--accent)", color: "var(--background)" }}
                aria-hidden="true"
              >
                TA
              </div>
              <div>
                <p className="clay-eyebrow mb-1">Written by</p>
                <h3 className="text-lg font-semibold text-theme mb-2">Tushar Agrawal</h3>
                <p className="text-sm text-theme-secondary leading-relaxed mb-3">
                  Full-Stack Engineer in New Delhi building healthcare SaaS at Dr. Dangs Lab.
                  3+ years shipping Python/Go microservices, event-driven systems, and HIPAA-compliant
                  platforms at 99.9% uptime. Creator of QAuth and QuantumShield.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Link href="/about" className="text-theme-accent hover:opacity-80 underline underline-offset-2">
                    About
                  </Link>
                  <a
                    href="https://github.com/Tushar010402"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-accent hover:opacity-80 underline underline-offset-2"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/tushar-agrawal-91b67a28a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-accent hover:opacity-80 underline underline-offset-2"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </section>

            {/* Community Q&A (giscus — renders only when env vars are configured) */}
            <PostDiscussion />

            {/* Related Posts */}
            {relatedBlogs.length > 0 && (
              <section
                className="clay-reveal mt-16 pt-8 max-w-3xl"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <h2 className="text-2xl font-bold mb-6 text-theme">Related Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedBlogs.map((relatedBlog) => (
                    <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`}>
                      <div className="rounded-lg p-4 hover:border-[--accent-muted] transition-all h-full" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <h3 className="font-semibold text-theme mb-2 line-clamp-2 text-sm">
                          {relatedBlog.title}
                        </h3>
                        <p className="text-xs text-theme-secondary line-clamp-2">{relatedBlog.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
