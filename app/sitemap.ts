import { MetadataRoute } from 'next';
import { getAllPosts, getAllTagSlugs } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

  const posts = getAllPosts();

  // Use the newest post date as an honest "last meaningful update" for content hubs,
  // instead of stamping `new Date()` on every build (which signals "everything changed"
  // to Google and erodes trust). Static informational pages get fixed real dates.
  const latestPostDate = posts.length
    ? new Date(posts[0].updated || posts[0].date)
    : new Date('2026-01-01');

  // Static pages — only real page URLs (hash fragments like #about are homepage sections).
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: latestPostDate, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date('2026-01-16'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: latestPostDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/quantum-shield`, lastModified: new Date('2026-02-04'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/quantum-shield/demo`, lastModified: new Date('2026-02-04'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/qauth`, lastModified: new Date('2026-01-30'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/qauth/docs`, lastModified: new Date('2026-01-30'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/qauth/demo`, lastModified: new Date('2026-01-30'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: new Date('2026-06-08'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Blog posts.
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Tag hub pages — internal-linking hubs that help crawl + index the long tail.
  const tagPages: MetadataRoute.Sitemap = getAllTagSlugs().map((slug) => ({
    url: `${baseUrl}/blog/tag/${slug}`,
    lastModified: latestPostDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages, ...tagPages];
}
