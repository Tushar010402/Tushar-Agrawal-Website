import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';

const INDEXNOW_KEY = 'a20e21d4acb5337398de17ea47ef1265';
const SITE_URL = 'https://www.tusharagrawal.in';

export async function POST() {
  try {
    // Get all URLs to submit
    const posts = getAllPosts();
    const urls = [
      SITE_URL,
      `${SITE_URL}/blog`,
      ...posts.map(post => `${SITE_URL}/blog/${post.slug}`)
    ];

    // Submit to IndexNow (Bing, Yandex, Seznam, Naver)
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

    return NextResponse.json({
      success: true,
      urlsSubmitted: urls.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const posts = getAllPosts();
  const urls = [
    SITE_URL,
    `${SITE_URL}/blog`,
    ...posts.map(post => `${SITE_URL}/blog/${post.slug}`)
  ];

  return NextResponse.json({
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlCount: urls.length,
    urls,
  });
}
