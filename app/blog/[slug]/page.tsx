import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostClient from './blog-post-client';
import { getPostBySlug, getRelatedPosts, getAllSlugs, getAllPosts } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found - Tushar Agrawal',
      description: 'The requested blog post could not be found.',
    };
  }

  const blogUrl = `${siteUrl}/blog/${post.slug}`;

  return {
    title: `${post.title} - Tushar Agrawal`,
    description: post.description,
    keywords: ['Tushar Agrawal', 'backend engineering', 'tech blog', ...post.tags],
    authors: [{ name: 'Tushar Agrawal', url: siteUrl }],
    alternates: {
      canonical: blogUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: blogUrl,
      siteName: 'Tushar Agrawal',
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      authors: ['Tushar Agrawal'],
      tags: post.tags,
      locale: 'en_US',
      images: post.image
        ? [
            {
              url: post.image,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
      creator: '@TusharAgrawal',
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, post.tags, 3);
  const allPosts = getAllPosts();
  const blogUrl = `${siteUrl}/blog/${post.slug}`;

  // Generate JSON-LD structured data for BlogPosting
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.image || `${siteUrl}/android-chrome-512x512.png`,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      '@type': 'Person',
      name: 'Tushar Agrawal',
      url: siteUrl,
      jobTitle: 'Backend Engineer',
      sameAs: [
        'https://www.linkedin.com/in/tushar-agrawal-91b67a28a',
        'https://github.com/Tushar010402',
      ],
    },
    publisher: {
      '@type': 'Person',
      name: 'Tushar Agrawal',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/android-chrome-512x512.png`,
      },
    },
    keywords: post.tags.join(', '),
    wordCount: post.content.split(/\s+/).length,
    articleBody: post.content.substring(0, 500),
    articleSection: post.tags[0] || 'Technology',
    url: blogUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': blogUrl,
    },
    inLanguage: 'en-US',
    isAccessibleForFree: true,
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
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: blogUrl,
      },
    ],
  };

  // Transform post to match BlogPostClient expected format
  const blog = {
    id: 1,
    slug: post.slug,
    title: post.title,
    description: post.description,
    content: post.content,
    author: post.author,
    tags: post.tags.join(', '),
    image_url: post.image || '',
    published: post.published,
    views: 0,
    created_at: post.date,
    updated_at: post.updated || post.date,
  };

  // Transform related posts
  const relatedBlogs = relatedPosts.map((p, index) => ({
    id: index + 2,
    slug: p.slug,
    title: p.title,
    description: p.description,
    content: '',
    author: p.author,
    tags: p.tags.join(', '),
    image_url: p.image || '',
    published: p.published,
    views: 0,
    created_at: p.date,
    updated_at: p.updated || p.date,
  }));

  // Transform all posts for sidebar
  const allBlogs = allPosts.map((p, index) => ({
    id: index + 100,
    slug: p.slug,
    title: p.title,
    description: p.description,
    content: '',
    author: p.author,
    tags: p.tags.join(', '),
    image_url: p.image || '',
    published: p.published,
    views: 0,
    created_at: p.date,
    updated_at: p.updated || p.date,
  }));

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

      <BlogPostClient blog={blog} comments={[]} relatedBlogs={relatedBlogs} allBlogs={allBlogs} />
    </>
  );
}
