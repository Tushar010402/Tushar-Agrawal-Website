import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getAllTagSlugs,
  getTagBySlug,
  getPostsByTag,
  getTagHubs,
} from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

interface PageProps {
  params: Promise<{ tag: string }>;
}

// Pre-render a page for every tag used across published posts.
export async function generateStaticParams() {
  return getAllTagSlugs().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const tagName = getTagBySlug(tag);

  if (!tagName) {
    return { title: 'Topic Not Found - Tushar Agrawal' };
  }

  const count = getPostsByTag(tag).length;
  const title = `${tagName} Articles & Tutorials - Tushar Agrawal`;
  const description = `${count} in-depth ${tagName} article${count === 1 ? '' : 's'} by Tushar Agrawal, covering real-world backend engineering, system design, and hands-on implementation.`;
  const url = `${siteUrl}/blog/tag/${tag}`;

  return {
    title,
    description,
    keywords: ['Tushar Agrawal', tagName, `${tagName} tutorial`, `${tagName} guide`, 'tech blog'],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: 'Tushar Agrawal',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@TusharAgrawal',
    },
    robots: { index: true, follow: true },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const tagName = getTagBySlug(tag);

  if (!tagName) {
    notFound();
  }

  const posts = getPostsByTag(tag);
  const url = `${siteUrl}/blog/tag/${tag}`;

  // Other topics to cross-link (builds the internal link graph for crawlers).
  const otherTags = getTagHubs()
    .filter((t) => t.slug !== tag)
    .slice(0, 40);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tagName} Articles - Tushar Agrawal`,
    description: `In-depth ${tagName} articles by Tushar Agrawal.`,
    url,
    isPartOf: { '@type': 'WebSite', name: 'Tushar Agrawal', url: siteUrl },
    about: { '@type': 'Thing', name: tagName },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 25).map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: tagName, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen py-20 px-4" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-theme-secondary mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-theme-accent transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-theme-accent transition-colors">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-theme">{tagName}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">{tagName}</h1>
          <p className="text-theme-secondary text-lg mb-10">
            {posts.length} article{posts.length === 1 ? '' : 's'} on {tagName}.
          </p>

          {/* Posts list */}
          <ul className="space-y-6 mb-16">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="rounded-xl p-6 transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Link href={`/blog/${post.slug}`} className="block group">
                  <h2 className="text-xl md:text-2xl font-semibold text-theme group-hover:text-theme-accent transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-theme-secondary text-sm md:text-base mb-3 line-clamp-2">
                    {post.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-theme-secondary">
                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span>·</span>
                    <span>{post.readingTime}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Browse other topics — internal-link hub */}
          <section aria-label="Other topics" style={{ borderTop: '1px solid var(--border)' }} className="pt-8">
            <h2 className="text-xl font-semibold text-theme mb-4">Browse other topics</h2>
            <div className="flex flex-wrap gap-2">
              {otherTags.map((t) => (
                <Link
                  key={t.slug}
                  href={`/blog/tag/${t.slug}`}
                  className="inline-flex items-center px-3 py-1 text-sm rounded-full text-theme-secondary hover:text-theme-accent transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {t.tag}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
