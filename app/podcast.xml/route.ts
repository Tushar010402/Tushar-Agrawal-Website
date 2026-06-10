import fs from 'fs';
import path from 'path';
import { getAllPosts } from '@/lib/blog';
import { getAudioForSlug } from '@/lib/audio-manifest';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

// Podcast RSS feed (iTunes/Spotify-compatible) of every narrated blog post.
// Episodes are the pre-generated neural narrations in public/audio/.
export const dynamic = 'force-static';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function itunesDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

export async function GET() {
  const episodes = getAllPosts()
    .map((post) => ({ post, audio: getAudioForSlug(post.slug) }))
    .filter((e): e is { post: ReturnType<typeof getAllPosts>[number]; audio: NonNullable<ReturnType<typeof getAudioForSlug>> } => Boolean(e.audio));

  const items = episodes
    .map(({ post, audio }) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const audioUrl = `${siteUrl}${audio.file}`;
      let sizeBytes = (audio.sizeKB || 0) * 1024;
      try {
        sizeBytes = fs.statSync(path.join(process.cwd(), 'public', audio.file)).size;
      } catch { /* fall back to manifest size */ }
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${url}#audio</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <enclosure url="${audioUrl}" length="${sizeBytes}" type="audio/mpeg" />
      ${audio.duration ? `<itunes:duration>${itunesDuration(audio.duration)}</itunes:duration>` : ''}
      <itunes:author>Tushar Agrawal</itunes:author>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Backend Engineering with Tushar Agrawal</title>
    <link>${siteUrl}/blog</link>
    <atom:link href="${siteUrl}/podcast.xml" rel="self" type="application/rss+xml" />
    <description>Narrated deep-dives from tusharagrawal.in — production war stories, backend architecture, performance engineering, post-quantum cryptography, and AI-era SEO, by Full-Stack Engineer Tushar Agrawal.</description>
    <language>en-us</language>
    <copyright>© ${new Date().getFullYear()} Tushar Agrawal</copyright>
    <itunes:author>Tushar Agrawal</itunes:author>
    <itunes:summary>Narrated engineering deep-dives: backend architecture, performance, security, and AI.</itunes:summary>
    <itunes:owner>
      <itunes:name>Tushar Agrawal</itunes:name>
      <itunes:email>tusharagrawal0104@gmail.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${siteUrl}/android-chrome-512x512.png" />
    <itunes:category text="Technology" />
    <itunes:explicit>false</itunes:explicit>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
