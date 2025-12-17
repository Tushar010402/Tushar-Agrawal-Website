'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Blog, Comment } from '@/lib/types';
import {
  Calendar,
  Eye,
  Tag as TagIcon,
  Share2,
  ArrowLeft,
  Clock,
  User,
  Mail,
  MessageSquare,
  Send,
  Linkedin,
  Twitter,
} from 'lucide-react';
import { blogAPI } from '@/lib/api';

interface BlogPostClientProps {
  blog: Blog;
  comments: Comment[];
  relatedBlogs: Blog[];
}

export default function BlogPostClient({ blog, comments: initialComments, relatedBlogs }: BlogPostClientProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentForm, setCommentForm] = useState({
    author_name: '',
    author_email: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

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

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      await blogAPI.createComment({
        blog_id: blog.id,
        ...commentForm,
      });

      setSubmitMessage('Comment submitted successfully! It will be visible after admin approval.');
      setCommentForm({ author_name: '', author_email: '', content: '' });
    } catch (error) {
      setSubmitMessage('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
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
              <img
                src={blog.image_url}
                alt={blog.title}
                className="w-full h-full object-cover"
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
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {blog.views} views
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
                <Share2 className="w-5 h-5" />
                Copy Link
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

        {/* Comments Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 pt-8 border-t border-neutral-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Comments ({comments.length})
          </h2>

          {/* Existing Comments */}
          {comments.length > 0 && (
            <div className="space-y-4 mb-8">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{comment.author_name}</h4>
                      <p className="text-sm text-gray-400">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>
            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      required
                      value={commentForm.author_name}
                      onChange={(e) =>
                        setCommentForm({ ...commentForm, author_name: e.target.value })
                      }
                      className="w-full bg-black border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email (optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={commentForm.author_email}
                      onChange={(e) =>
                        setCommentForm({ ...commentForm, author_email: e.target.value })
                      }
                      className="w-full bg-black border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium mb-2">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  required
                  rows={5}
                  value={commentForm.content}
                  onChange={(e) =>
                    setCommentForm({ ...commentForm, content: e.target.value })
                  }
                  className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Write your comment..."
                />
              </div>

              {submitMessage && (
                <p
                  className={`text-sm ${
                    submitMessage.includes('success') ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {submitMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg transition-all"
              >
                <Send className="w-5 h-5" />
                {isSubmitting ? 'Submitting...' : 'Submit Comment'}
              </button>

              <p className="text-sm text-gray-400">
                Your comment will be visible after admin approval.
              </p>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
