import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, getAllTagSlugs } from '@/lib/blog';

const INDEXNOW_KEY = 'a20e21d4acb5337398de17ea47ef1265';
const SITE_URL = 'https://www.tusharagrawal.in';

// Bing flags repeated full-site submissions as "batch mode" and deprioritizes them.
// Streaming mode = submit only the URLs that changed. POST a JSON body
// { "urls": ["https://www.tusharagrawal.in/blog/some-post", ...] } to do that;
// a body-less POST falls back to the full list (use only for one-off full resyncs).
const MAX_URLS_PER_SUBMISSION = 500;

// Build the full list of canonical URLs (static + posts + tag hubs).
function buildUrlList(): string[] {
  const staticPaths = [
    '',
    '/about',
    '/blog',
    '/quantum-shield',
    '/quantum-shield/demo',
    '/qauth',
    '/qauth/docs',
    '/qauth/demo',
  ];
  const posts = getAllPosts();
  return [
    ...staticPaths.map((p) => `${SITE_URL}${p}`),
    ...posts.map((post) => `${SITE_URL}/blog/${post.slug}`),
    ...getAllTagSlugs().map((slug) => `${SITE_URL}/blog/tag/${slug}`),
  ];
}

async function submitToIndexNow(urls: string[]) {
  const indexNowEndpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
  ];

  const results = await Promise.allSettled(
    indexNowEndpoints.map(async (endpoint) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host: 'www.tusharagrawal.in',
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: urls,
        }),
      });
      return { endpoint, status: response.status, ok: response.ok };
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) }));
}

export async function POST(request: NextRequest) {
  try {
    // Streaming mode: caller supplies only the changed URLs.
    let requestedUrls: string[] | null = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.urls)) {
        requestedUrls = body.urls;
      }
    } catch {
      // No/invalid JSON body — fall through to full-list mode.
    }

    let urls: string[];
    let mode: 'streaming' | 'full';
    if (requestedUrls && requestedUrls.length > 0) {
      // Only our own host's URLs are submittable (the endpoint is public).
      urls = Array.from(
        new Set(
          requestedUrls.filter(
            (u): u is string =>
              typeof u === 'string' && (u === SITE_URL || u.startsWith(`${SITE_URL}/`))
          )
        )
      ).slice(0, MAX_URLS_PER_SUBMISSION);
      mode = 'streaming';
      if (urls.length === 0) {
        return NextResponse.json(
          { success: false, error: `No valid URLs (must start with ${SITE_URL})` },
          { status: 400 }
        );
      }
    } else {
      urls = buildUrlList();
      mode = 'full';
    }

    const results = await submitToIndexNow(urls);

    return NextResponse.json({
      success: true,
      mode,
      urlsSubmitted: urls.length,
      ...(mode === 'streaming' ? { urls } : {}),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const urls = buildUrlList();

  return NextResponse.json({
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlCount: urls.length,
    urls,
  });
}
