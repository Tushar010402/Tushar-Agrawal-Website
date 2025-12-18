import { getAllPosts } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

export async function GET() {
  const posts = getAllPosts();

  const rssItems = posts
    .map((post) => {
      const pubDate = new Date(post.date).toUTCString();
      const categories = post.tags
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join('\n        ');

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>tusharagrawal0104@gmail.com (Tushar Agrawal)</author>
      ${categories}
      ${post.image ? `<enclosure url="${escapeXml(post.image)}" type="image/jpeg" />` : ''}
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Tushar Agrawal - Technical Blog</title>
    <link>${siteUrl}/blog</link>
    <description>In-depth articles on microservices, Python, Go, FastAPI, healthcare SaaS, Docker, DevOps, and backend engineering. Learn from real-world implementations and best practices.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>tusharagrawal0104@gmail.com (Tushar Agrawal)</managingEditor>
    <webMaster>tusharagrawal0104@gmail.com (Tushar Agrawal)</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} Tushar Agrawal. All rights reserved.</copyright>
    <generator>Next.js</generator>
    <image>
      <url>${siteUrl}/android-chrome-512x512.png</url>
      <title>Tushar Agrawal - Technical Blog</title>
      <link>${siteUrl}/blog</link>
    </image>
    <ttl>60</ttl>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
