#!/usr/bin/env ts-node

/**
 * Script to ping search engines about sitemap updates
 * Run after deployment: npx ts-node scripts/ping-search-engines.ts
 */

const SITE_URL = 'https://www.tusharagrawal.in';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const INDEXNOW_KEY = 'a20e21d4acb5337398de17ea47ef1265';

async function pingSearchEngines() {
  console.log('Pinging search engines...\n');

  // Google Ping (deprecated but still works for sitemaps)
  const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;

  // Bing Ping
  const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;

  // IndexNow for Bing/Yandex
  const indexNowPayload = {
    host: 'www.tusharagrawal.in',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: [
      SITE_URL,
      `${SITE_URL}/blog`,
    ],
  };

  const results: { service: string; status: string }[] = [];

  // Ping Google
  try {
    const response = await fetch(googlePing);
    results.push({ service: 'Google Ping', status: response.ok ? 'Success' : `Failed: ${response.status}` });
  } catch (error) {
    results.push({ service: 'Google Ping', status: `Error: ${error}` });
  }

  // Ping Bing
  try {
    const response = await fetch(bingPing);
    results.push({ service: 'Bing Ping', status: response.ok ? 'Success' : `Failed: ${response.status}` });
  } catch (error) {
    results.push({ service: 'Bing Ping', status: `Error: ${error}` });
  }

  // IndexNow to Bing
  try {
    const response = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indexNowPayload),
    });
    results.push({ service: 'Bing IndexNow', status: response.ok || response.status === 202 ? 'Success' : `Failed: ${response.status}` });
  } catch (error) {
    results.push({ service: 'Bing IndexNow', status: `Error: ${error}` });
  }

  // IndexNow to IndexNow.org (shared with multiple engines)
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indexNowPayload),
    });
    results.push({ service: 'IndexNow API', status: response.ok || response.status === 202 ? 'Success' : `Failed: ${response.status}` });
  } catch (error) {
    results.push({ service: 'IndexNow API', status: `Error: ${error}` });
  }

  // Print results
  console.log('Results:');
  console.log('─'.repeat(40));
  results.forEach(({ service, status }) => {
    const icon = status === 'Success' ? '✓' : '✗';
    console.log(`${icon} ${service}: ${status}`);
  });
  console.log('─'.repeat(40));
  console.log('\nDone!');
}

pingSearchEngines();
