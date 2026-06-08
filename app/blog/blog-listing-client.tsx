'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Blog } from '@/lib/types';
import { Search, Calendar, Clock, ArrowRight, ChevronDown, X, Filter, Grid3X3, List } from 'lucide-react';
interface BlogListingClientProps {
  initialBlogs: Blog[];
}

const BLOGS_PER_PAGE = 9;

// Category groups for better organization
const TAG_CATEGORIES: Record<string, string[]> = {
  'Languages': ['Python', 'Go', 'Golang', 'TypeScript', 'JavaScript', 'Java', 'C', 'Rust', 'Lambda'],
  'Frameworks': ['FastAPI', 'Django', 'React', 'Node.js', 'Next.js', 'Flask', 'REST API', 'GraphQL'],
  'Cloud & DevOps': ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Nginx', 'Apache', 'S3', 'RDS', 'Cloud', 'Cloud Native', 'Helm', 'Istio', 'Service Mesh', 'GitOps', 'Serverless'],
  'Databases': ['PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB', 'Database', 'NoSQL', 'Caching'],
  'Architecture': ['Microservices', 'System Design', 'Distributed Systems', 'Event-Driven', 'Architecture', 'Scalability', 'Software Architecture', 'API Design'],
  'Security': ['Authentication', 'Authorization', 'JWT', 'OAuth', 'Security', 'SSL', 'HIPAA', 'Compliance', 'CVE', 'Web Security'],
  'Testing': ['Testing', 'TDD', 'Unit Testing', 'Integration Testing', 'Jest', 'pytest', 'E2E Testing'],
  'Topics': ['Backend', 'Frontend', 'Performance', 'Best Practices', 'Career', 'Interview', 'Trends', '2025'],
};

export default function BlogListingClient({ initialBlogs }: BlogListingClientProps) {
  const [blogs] = useState<Blog[]>(initialBlogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Get popular tags (top 8 by frequency)
  const popularTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    blogs.forEach((blog) => {
      if (blog.tags) {
        blog.tags.split(',').forEach((tag) => {
          const trimmed = tag.trim();
          tagCount[trimmed] = (tagCount[trimmed] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [blogs]);

  // Filter and search blogs
  const filteredBlogs = useMemo(() => {
    let result = blogs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (blog) =>
          blog.title.toLowerCase().includes(query) ||
          blog.description.toLowerCase().includes(query) ||
          blog.tags.toLowerCase().includes(query)
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((blog) =>
        selectedTags.some((tag) =>
          blog.tags.split(',').map((t) => t.trim().toLowerCase()).includes(tag.toLowerCase())
        )
      );
    }

    return result;
  }, [blogs, searchQuery, selectedTags]);

  // Pagination
  const totalPages = Math.ceil(filteredBlogs.length / BLOGS_PER_PAGE);
  const paginatedBlogs = useMemo(() => {
    const start = (currentPage - 1) * BLOGS_PER_PAGE;
    const end = start + BLOGS_PER_PAGE;
    return filteredBlogs.slice(start, end);
  }, [filteredBlogs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  // Featured post (latest)
  const featuredPost = filteredBlogs[0];
  const remainingPosts = paginatedBlogs.slice(currentPage === 1 ? 1 : 0);

  return (
    <div className="min-h-screen text-theme" style={{ background: "var(--background)" }}>
      {/* Hero Section — Clay editorial */}
      <div className="relative overflow-hidden pt-36 pb-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "clamp(48px, 7vw, 96px) clamp(48px, 7vw, 96px)",
            maskImage: "radial-gradient(110% 80% at 25% 0%, #000 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(110% 80% at 25% 0%, #000 30%, transparent 80%)",
            opacity: 0.6,
          }}
        />
        <div className="clay-container relative">
          <p className="clay-rise clay-eyebrow mb-6">Writing · {blogs.length} articles</p>
          <h1 className="clay-rise clay-rise-1 clay-display max-w-[14ch]">Notes from the backend.</h1>
          <p className="clay-rise clay-rise-2 clay-lead text-theme-secondary mt-8 max-w-2xl">
            Deep dives into backend engineering, distributed systems, post-quantum security, and the
            occasional production war story.
          </p>

          {/* Search */}
          <div className="clay-rise clay-rise-3 relative max-w-xl mt-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full pl-13 pr-5 py-4 text-theme placeholder-theme-tertiary focus:outline-none transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", paddingLeft: "3.25rem" }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {/* Left: Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  selectedTags.length > 0
                    ? 'border text-theme-accent'
                    : 'text-theme-secondary hover:text-theme'
                }`}
                style={selectedTags.length === 0 ? { background: "var(--surface)", border: "1px solid var(--border)" } : { border: "1px solid" }}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {selectedTags.length > 0 && (
                  <span className="bg-[--accent] text-white text-xs px-1.5 py-0.5 rounded-full">
                    {selectedTags.length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Filter Dropdown Panel */}
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-[320px] md:w-[480px] rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="font-semibold text-theme">Filter by Topic</span>
                      {selectedTags.length > 0 && (
                        <button
                          onClick={clearFilters}
                          className="text-sm text-theme-accent hover:opacity-80"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
                      {Object.entries(TAG_CATEGORIES).map(([category, tags]) => {
                        const availableTags = tags.filter((tag) =>
                          allTags.some((t) => t.toLowerCase() === tag.toLowerCase())
                        );
                        if (availableTags.length === 0) return null;

                        return (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                              {category}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {availableTags.map((tag) => {
                                const actualTag = allTags.find((t) => t.toLowerCase() === tag.toLowerCase()) || tag;
                                const isSelected = selectedTags.some((t) => t.toLowerCase() === actualTag.toLowerCase());
                                return (
                                  <button
                                    key={tag}
                                    onClick={() => toggleTag(actualTag)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                      isSelected
                                        ? 'bg-[--accent] text-white'
                                        : 'text-theme-secondary hover:text-theme'
                                    }`}
                                    style={!isSelected ? { background: "color-mix(in srgb, var(--surface) 80%, transparent)" } : {}}
                                  >
                                    {actualTag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Filter Tags */}
            <div className="hidden md:flex items-center gap-2">
              {popularTags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-[--accent] text-white'
                      : 'text-theme-secondary hover:text-theme'
                  }`}
                  style={!selectedTags.includes(tag) ? { background: "color-mix(in srgb, var(--surface) 50%, transparent)" } : {}}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Active Filters */}
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-theme-secondary text-sm">|</span>
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[--accent-subtle] text-theme-accent text-sm rounded-lg"
                  >
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-theme">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: View Toggle & Results Count */}
          <div className="flex items-center gap-4">
            <span className="text-theme-secondary text-sm">
              {filteredBlogs.length} {filteredBlogs.length === 1 ? 'article' : 'articles'}
            </span>
            <div className="flex items-center rounded-lg p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid' ? 'text-theme' : 'text-theme-secondary hover:text-theme'
                }`}
                style={viewMode === 'grid' ? { background: "color-mix(in srgb, var(--surface) 150%, var(--background))" } : {}}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list' ? 'text-theme' : 'text-theme-secondary hover:text-theme'
                }`}
                style={viewMode === 'list' ? { background: "color-mix(in srgb, var(--surface) 150%, var(--background))" } : {}}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Post (only on first page with no filters) */}
        {currentPage === 1 && selectedTags.length === 0 && !searchQuery && featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <Link href={`/blog/${featuredPost.slug}`}>
              <div className="group relative rounded-2xl overflow-hidden hover:border-[--accent-muted] transition-all duration-300" style={{ background: "linear-gradient(to bottom right, var(--surface), color-mix(in srgb, var(--surface) 50%, transparent))", border: "1px solid var(--border)" }}>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Image */}
                  {featuredPost.image_url && (
                    <div className="relative h-64 md:h-80 overflow-hidden">
                      <Image
                        src={featuredPost.image_url}
                        alt={featuredPost.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        priority
                      />
                      <div className="absolute inset-0 md:block hidden" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--surface) 80%, transparent))" }} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <span className="inline-flex items-center gap-2 text-theme-accent text-sm font-medium mb-3">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                      Latest Article
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-theme mb-4 group-hover:text-theme-accent transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-theme-secondary mb-6 line-clamp-3">
                      {featuredPost.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-theme-secondary">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredPost.created_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readingTime || '5 min read'}
                      </span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-theme-accent font-medium group-hover:gap-3 transition-all">
                      Read Article <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Blog Grid/List */}
        {filteredBlogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-theme mb-2">No articles found</h3>
            <p className="text-theme-secondary mb-6">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-[--accent] text-white rounded-lg hover:opacity-90 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingPosts.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/blog/${blog.slug}`}>
                  <article className="group rounded-xl overflow-hidden hover:border-[--accent-muted] transition-all duration-300 h-full flex flex-col" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
                    {/* Image */}
                    {blog.image_url && (
                      <div className="relative h-44 overflow-hidden">
                        <Image
                          src={blog.image_url}
                          alt={blog.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--surface), transparent, transparent)" }} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {blog.tags.split(',').slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[--accent-subtle] text-theme-accent text-xs rounded-md"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-semibold text-theme mb-2 group-hover:text-theme-accent transition-colors line-clamp-2">
                        {blog.title}
                      </h2>

                      {/* Description */}
                      <p className="text-theme-secondary text-sm mb-4 line-clamp-2 flex-1">
                        {blog.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between text-xs text-theme-secondary pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(blog.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {blog.readingTime || '5 min'}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {remainingPosts.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/blog/${blog.slug}`}>
                  <article className="group flex gap-4 rounded-xl p-4 hover:border-[--accent-muted] transition-all duration-300" style={{ background: "color-mix(in srgb, var(--surface) 50%, transparent)", border: "1px solid var(--border)" }}>
                    {/* Image */}
                    {blog.image_url && (
                      <div className="relative w-32 h-24 md:w-48 md:h-32 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={blog.image_url}
                          alt={blog.title}
                          fill
                          sizes="200px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {blog.tags.split(',').slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[--accent-subtle] text-theme-accent text-xs rounded-md"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-lg font-semibold text-theme mb-1 group-hover:text-theme-accent transition-colors line-clamp-1">
                        {blog.title}
                      </h2>
                      <p className="text-theme-secondary text-sm mb-2 line-clamp-2">
                        {blog.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-theme-secondary">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(blog.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {blog.readingTime || '5 min'}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center">
                      <ArrowRight className="w-5 h-5 text-theme-secondary group-hover:text-theme-accent group-hover:translate-x-1 transition-all" />
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-12"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm text-theme"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first, last, current, and adjacent pages
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg transition-all text-sm ${
                        currentPage === page
                          ? 'bg-[--accent] text-white'
                          : 'text-theme'
                      }`}
                      style={currentPage !== page ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-theme-secondary">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm text-theme"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
