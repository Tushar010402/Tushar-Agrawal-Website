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

export function getAllPosts(): BlogMeta[] {
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
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
