import { blogAPI } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

export async function GET() {
  try {
    const blogs = await blogAPI.getAll();

    const rssItems = blogs
      .map((blog) => {
        const pubDate = new Date(blog.created_at).toUTCString();
        const categories = blog.tags
          .split(',')
          .map((tag) => `<category>${escapeXml(tag.trim())}</category>`)
          .join('\n        ');

        return `
    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${siteUrl}/blog/${blog.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${blog.slug}</guid>
      <description>${escapeXml(blog.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>tusharagrawal0104@gmail.com (Tushar Agrawal)</author>
      ${categories}
      ${blog.image_url ? `<enclosure url="${escapeXml(blog.image_url)}" type="image/jpeg" />` : ''}
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
  } catch (error) {
    console.error('Error generating RSS feed:', error);

    // Return a minimal valid RSS feed on error
    const fallbackRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tushar Agrawal - Technical Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Technical blog by Tushar Agrawal</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

    return new Response(fallbackRss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
