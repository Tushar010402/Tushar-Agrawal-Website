#!/usr/bin/env node
/**
 * Generate dev.to / Hashnode-ready cross-post versions of selected blog posts.
 *
 * Each output keeps a `canonical_url` pointing back to tusharagrawal.in, so
 * Google treats your site as the original (no duplicate-content penalty) while
 * the cross-post earns you a real backlink + referral traffic — the one ranking
 * lever code can't manufacture.
 *
 * Usage: node scripts/make-crosspost.mjs            (default flagship set)
 *        node scripts/make-crosspost.mjs <slug> ... (specific posts)
 * Output: distribution/devto/<slug>.md  — paste straight into dev.to's editor.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BLOG_DIR = path.join(ROOT, 'content/blog');
const OUT_DIR = path.join(ROOT, 'distribution/devto');
const SITE = 'https://www.tusharagrawal.in';

const DEFAULT = [
  'redis-cache-stampede-p99-latency-war-story',
  'kafka-consumer-lag-2-million-debugging-war-story',
  'llms-txt-generative-engine-optimization-developers-2026',
  'technical-seo-nextjs-developers-complete-guide-2026',
  'building-backends-for-ai-agents-idempotency-retries-state',
];

// dev.to tags: lowercase alphanumeric, max 4. Fall back to broad dev tags.
function devtoTags(tags) {
  const clean = (tags || [])
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 1 && t.length <= 20);
  const out = [...new Set(clean)].slice(0, 4);
  for (const fallback of ['webdev', 'backend', 'programming', 'tutorial']) {
    if (out.length >= 4) break;
    if (!out.includes(fallback)) out.push(fallback);
  }
  return out.slice(0, 4);
}

// Rewrite site-relative links to absolute so they work off-site, and skip
// in-page anchors (#...). Leaves external links untouched.
function absolutize(body) {
  return body
    .replace(/\]\(\/blog\//g, `](${SITE}/blog/`)
    .replace(/\]\((\/(?!\/)[a-zA-Z0-9])/g, `](${SITE}$1`);
}

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const slug of slugs) {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.error(`✗ no such post: ${slug}`);
    continue;
  }
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const canonical = `${SITE}/blog/${slug}`;
  const body = absolutize(content.trim());

  const fm = [
    '---',
    `title: ${JSON.stringify(data.title || slug)}`,
    'published: false',
    `description: ${JSON.stringify((data.description || '').slice(0, 160))}`,
    `tags: ${devtoTags(data.tags).join(', ')}`,
    data.image ? `cover_image: ${data.image}` : '',
    `canonical_url: ${canonical}`,
    '---',
  ].filter(Boolean).join('\n');

  const footer = `\n\n---\n\n*Originally published at [tusharagrawal.in](${canonical}). I write about backend engineering, performance, and AI-era infrastructure — more at [tusharagrawal.in/blog](${SITE}/blog).*`;

  fs.writeFileSync(path.join(OUT_DIR, `${slug}.md`), `${fm}\n\n${body}${footer}\n`);
  console.log(`✓ distribution/devto/${slug}.md`);
}

console.log(`\n${slugs.length} cross-post drafts ready. Paste each into dev.to / Hashnode, keep the canonical_url, publish.`);
