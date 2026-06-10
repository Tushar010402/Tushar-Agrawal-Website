import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  updated?: string;
  author: string;
  tags: string[];
  image?: string;
  published: boolean;
  readingTime: string;
}

export interface BlogMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  tags: string[];
  image?: string;
  published: boolean;
  readingTime: string;
}

function getMarkdownFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }
  return fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.md') || file.endsWith('.mdx'));
}

// Memoize parsed post metadata. Content files are immutable during a build, and a static
// export prerenders hundreds of pages (every post + every tag hub), each of which calls
// getAllPosts several times. Re-reading and parsing 70+ markdown files (some >100KB) on
// every call made tag-page export time out. Reading once per worker fixes that.
let cachedPosts: BlogMeta[] | null = null;

export function getAllPosts(): BlogMeta[] {
  if (cachedPosts) {
    return cachedPosts;
  }

  const files = getMarkdownFiles();

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.(md|mdx)$/, '');
      const filePath = path.join(BLOG_DIR, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);

      // Skip unpublished posts in production
      if (process.env.NODE_ENV === 'production' && data.published === false) {
        return null;
      }

      const stats = readingTime(content);

      return {
        slug,
        title: data.title || 'Untitled',
        description: data.description || '',
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        updated: data.updated ? new Date(data.updated).toISOString() : undefined,
        author: data.author || 'Tushar Agrawal',
        tags: data.tags || [],
        image: data.image || undefined,
        published: data.published !== false,
        readingTime: stats.text,
      } as BlogMeta;
    })
    .filter((post): post is BlogMeta => post !== null);

  // Sort by date (newest first)
  cachedPosts = posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return cachedPosts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const files = getMarkdownFiles();
  const filename = files.find((file) => file.replace(/\.(md|mdx)$/, '') === slug);

  if (!filename) {
    return null;
  }

  const filePath = path.join(BLOG_DIR, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  // Skip unpublished posts in production
  if (process.env.NODE_ENV === 'production' && data.published === false) {
    return null;
  }

  const stats = readingTime(content);

  return {
    slug,
    title: data.title || 'Untitled',
    description: data.description || '',
    content,
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    updated: data.updated ? new Date(data.updated).toISOString() : undefined,
    author: data.author || 'Tushar Agrawal',
    tags: data.tags || [],
    image: data.image || undefined,
    published: data.published !== false,
    readingTime: stats.text,
  };
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();

  posts.forEach((post) => {
    post.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

// Convert a human tag (e.g. "Exa.ai Alternative") into a URL-safe slug.
export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics (spaces, dots, slashes) -> hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

// Minimum posts a tag needs to get its own hub page. Single-post tags would be thin,
// near-duplicate pages of the post itself — exactly the kind of page we don't want indexed.
// Raised 2 -> 3 (June 2026): GSC showed ~45 "Discovered - currently not indexed" pages,
// dominated by thin 2-post hubs; below-threshold tag URLs now 308 to /blog instead.
export const TAG_HUB_MIN_POSTS = 3;

// Display tags that have at least `min` published posts, with their post counts.
// Used for tag hubs, sitemap, and "browse by topic" rows (newest/most-used first).
export function getTagHubs(min: number = TAG_HUB_MIN_POSTS): { tag: string; slug: string; count: number }[] {
  const counts = new Map<string, number>();
  getAllPosts().forEach((post) => {
    post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  // Collapse tags that slugify to the same value (e.g. "Go" / "go").
  const bySlug = new Map<string, { tag: string; slug: string; count: number }>();
  for (const [tag, count] of counts) {
    if (count < min) continue;
    const slug = slugifyTag(tag);
    const existing = bySlug.get(slug);
    if (existing) {
      existing.count += count;
    } else {
      bySlug.set(slug, { tag, slug, count });
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// Tag slugs that warrant a hub page (for generateStaticParams / sitemap).
export function getAllTagSlugs(): string[] {
  return getTagHubs().map((t) => t.slug);
}

// Resolve a tag slug back to its canonical display tag (first match wins).
// Checks all tags (not just hub tags) so stray single-tag links still resolve on demand.
export function getTagBySlug(slug: string): string | null {
  return getAllTags().find((tag) => slugifyTag(tag) === slug) || null;
}

// All published posts carrying the given tag slug, newest first.
export function getPostsByTag(slug: string): BlogMeta[] {
  return getAllPosts().filter((post) =>
    post.tags.some((tag) => slugifyTag(tag) === slug)
  );
}

export function getRelatedPosts(currentSlug: string, tags: string[], limit: number = 3): BlogMeta[] {
  const allPosts = getAllPosts();

  return allPosts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => {
      const commonTags = post.tags.filter((tag) => tags.includes(tag)).length;
      return { ...post, commonTags };
    })
    .filter((post) => post.commonTags > 0)
    .sort((a, b) => b.commonTags - a.commonTags)
    .slice(0, limit);
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}
