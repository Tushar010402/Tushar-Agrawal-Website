import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostClient from './blog-post-client';
import { blogAPI } from '@/lib/api';
import { Blog, Comment } from '@/lib/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // Revalidate every 60 seconds

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const blog = await blogAPI.getBySlug(slug);

    const keywords = blog.tags ? blog.tags.split(',').map((t) => t.trim()) : [];

    return {
      title: `${blog.title} - Tushar Agrawal`,
      description: blog.description,
      keywords: ['Tushar Agrawal', ...keywords],
      authors: [{ name: 'Tushar Agrawal' }],
      openGraph: {
        title: blog.title,
        description: blog.description,
        type: 'article',
        publishedTime: blog.created_at,
        modifiedTime: blog.updated_at,
        authors: ['Tushar Agrawal'],
        tags: keywords,
        images: blog.image_url
          ? [
              {
                url: blog.image_url,
                width: 1200,
                height: 630,
                alt: blog.title,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.title,
        description: blog.description,
        images: blog.image_url ? [blog.image_url] : [],
        creator: '@TusharAgrawal',
      },
    };
  } catch (error) {
    return {
      title: 'Blog Post Not Found - Tushar Agrawal',
      description: 'The requested blog post could not be found.',
    };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let blog: Blog | null = null;
  let comments: Comment[] = [];
  let relatedBlogs: (Blog & { commonTags: number })[] = [];
  let error: string | null = null;

  try {
    // Fetch blog post
    blog = await blogAPI.getBySlug(slug);

    // Fetch comments and related blogs in parallel
    const [commentsData, allBlogs] = await Promise.all([
      blogAPI.getComments(blog.id).catch(() => []),
      blogAPI.getAll().catch(() => []),
    ]);

    comments = commentsData;

    // Find related blogs based on common tags
    if (blog.tags && allBlogs.length > 0) {
      const blogId = blog.id;
      const blogTags = blog.tags.split(',').map((t) => t.trim().toLowerCase());
      relatedBlogs = allBlogs
        .filter((b) => b.id !== blogId)
        .map((b) => {
          const bTags = b.tags.split(',').map((t) => t.trim().toLowerCase());
          const commonTags = blogTags.filter((tag) => bTags.includes(tag)).length;
          return { ...b, commonTags };
        })
        .filter((b) => b.commonTags > 0)
        .sort((a, b) => b.commonTags - a.commonTags)
        .slice(0, 3);
    }
  } catch (err) {
    console.error('Error fetching blog:', err);
    error = err instanceof Error ? err.message : 'Failed to load blog post';
  }

  if (error || !blog) {
    notFound();
  }

  // Generate JSON-LD structured data for BlogPosting
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.description,
    image: blog.image_url || 'https://yourdomain.com/default-blog-image.jpg',
    datePublished: blog.created_at,
    dateModified: blog.updated_at,
    author: {
      '@type': 'Person',
      name: 'Tushar Agrawal',
      url: 'https://yourdomain.com',
      jobTitle: 'Backend Engineer',
      sameAs: [
        'https://www.linkedin.com/in/tushar-agrawal-91b67a28a',
        'https://github.com/Tushar010402',
      ],
    },
    publisher: {
      '@type': 'Person',
      name: 'Tushar Agrawal',
      url: 'https://yourdomain.com',
    },
    keywords: blog.tags,
    wordCount: blog.content.split(/\s+/).length,
    articleBody: blog.content,
    url: `https://yourdomain.com/blog/${blog.slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://yourdomain.com/blog/${blog.slug}`,
    },
  };

  // Generate BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://yourdomain.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://yourdomain.com/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: blog.title,
        item: `https://yourdomain.com/blog/${blog.slug}`,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <BlogPostClient blog={blog} comments={comments} relatedBlogs={relatedBlogs} />
    </>
  );
}
