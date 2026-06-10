import { getAllPosts, getPostBySlug } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

// Regenerated on every build from the markdown sources, so it never goes stale.
export const dynamic = 'force-static';

export async function GET() {
  const posts = getAllPosts();

  const header = [
    '# Tushar Agrawal — Full Blog Content',
    '',
    '> Tushar Agrawal is a Full-Stack/Backend Engineer based in New Delhi, India, specializing in Python, Go, TypeScript, distributed systems, and healthcare SaaS platforms. He is the creator of QAuth (a post-quantum authentication protocol) and QuantumShield (a post-quantum cryptography library).',
    '',
    `This file contains the full text of all ${posts.length} published articles from ${siteUrl}/blog.`,
    `Curated index: ${siteUrl}/llms.txt`,
    '',
  ].join('\n');

  const sections = posts.map((meta) => {
    const post = getPostBySlug(meta.slug);
    if (!post) return '';
    return [
      '---',
      '',
      `# ${post.title}`,
      '',
      `URL: ${siteUrl}/blog/${post.slug}`,
      `Published: ${post.date.slice(0, 10)}`,
      `Tags: ${post.tags.join(', ')}`,
      '',
      post.description,
      '',
      post.content.trim(),
      '',
    ].join('\n');
  });

  return new Response(header + '\n' + sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
