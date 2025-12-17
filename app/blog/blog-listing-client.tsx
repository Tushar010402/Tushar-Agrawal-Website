'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Blog } from '@/lib/types';
import { Search, Calendar, Eye, Tag as TagIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface BlogListingClientProps {
  initialBlogs: Blog[];
}

const BLOGS_PER_PAGE = 6;

export default function BlogListingClient({ initialBlogs }: BlogListingClientProps) {
  const [blogs] = useState<Blog[]>(initialBlogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    blogs.forEach((blog) => {
      if (blog.tags) {
        blog.tags.split(',').forEach((tag) => tagSet.add(tag.trim()));
      }
    });
    return Array.from(tagSet).sort();
  }, [blogs]);

  // Filter and search blogs
  const filteredBlogs = useMemo(() => {
    let result = blogs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (blog) =>
          blog.title.toLowerCase().includes(query) ||
          blog.description.toLowerCase().includes(query) ||
          blog.tags.toLowerCase().includes(query)
      );
    }

    // Filter by selected tag
    if (selectedTag) {
      result = result.filter((blog) =>
        blog.tags.split(',').map((t) => t.trim()).includes(selectedTag)
      );
    }

    return result;
  }, [blogs, searchQuery, selectedTag]);

  // Pagination
  const totalPages = Math.ceil(filteredBlogs.length / BLOGS_PER_PAGE);
  const paginatedBlogs = useMemo(() => {
    const start = (currentPage - 1) * BLOGS_PER_PAGE;
    const end = start + BLOGS_PER_PAGE;
    return filteredBlogs.slice(start, end);
  }, [filteredBlogs, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate reading time (roughly 200 words per minute)
  const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  return (
    <div className="min-h-screen bg-black text-white py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            Technical Blog
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            In-depth articles on microservices, backend engineering, Python, Go, FastAPI, and real-world system design by Tushar Agrawal
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <span className="text-gray-400 text-sm">Filter by:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                selectedTag === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-900 text-gray-400 hover:bg-neutral-800'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-900 text-gray-400 hover:bg-neutral-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-gray-400 mb-8"
        >
          {filteredBlogs.length === 0 ? (
            <p>No articles found matching your criteria.</p>
          ) : (
            <p>
              Showing {filteredBlogs.length} {filteredBlogs.length === 1 ? 'article' : 'articles'}
            </p>
          )}
        </motion.div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {paginatedBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link href={`/blog/${blog.slug}`}>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-blue-500 transition-all duration-300 h-full flex flex-col group">
                  {/* Image */}
                  {blog.image_url && (
                    <div className="relative w-full h-48 bg-neutral-800 overflow-hidden">
                      <img
                        src={blog.image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Title */}
                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                      {blog.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.tags.split(',').slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-800 text-gray-300 text-xs rounded"
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag.trim()}
                        </span>
                      ))}
                      {blog.tags.split(',').length > 3 && (
                        <span className="px-2 py-1 bg-neutral-800 text-gray-400 text-xs rounded">
                          +{blog.tags.split(',').length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-neutral-800 pt-4">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(blog.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {blog.views}
                        </span>
                      </div>
                      <span className="text-gray-400">{calculateReadingTime(blog.content)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-2"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
