#!/usr/bin/env node
/**
 * Pre-generate studio-quality narration MP3s for blog posts using Microsoft
 * Edge neural TTS (free, no API key) via the python `edge-tts` package.
 *
 * Usage:
 *   node scripts/generate-audio.mjs <slug> [slug...]   # specific posts
 *   node scripts/generate-audio.mjs --flagship          # the curated flagship set
 *   node scripts/generate-audio.mjs --all               # every published post
 *
 * Requires: python3 + `pip3 install --user --break-system-packages edge-tts`, ffmpeg.
 * Output: public/audio/<slug>.mp3 (32kbps mono) + public/audio/manifest.json
 * The blog player auto-detects entries in the manifest and switches from
 * browser speech synthesis to the real audio file.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BLOG_DIR = path.join(ROOT, 'content/blog');
const OUT_DIR = path.join(ROOT, 'public/audio');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const VOICE = 'en-US-AndrewMultilingualNeural'; // warm, natural male voice
const RATE = '+4%';

const FLAGSHIP = [
  'redis-cache-stampede-p99-latency-war-story',
  'kafka-consumer-lag-2-million-debugging-war-story',
  'database-connection-pooling-performance-guide',
  'building-scalable-microservices-with-go-and-fastapi',
  'post-quantum-cryptography-migration-guide-2026',
  'qauth-post-quantum-authentication-protocol',
  'python-asyncio-complete-guide',
  'building-backends-for-ai-agents-idempotency-retries-state',
  'technical-seo-nextjs-developers-complete-guide-2026',
  'llms-txt-generative-engine-optimization-developers-2026',
  'core-web-vitals-backend-engineers-server-performance-2026',
  'google-june-2026-ai-search-updates-developers-guide',
];

// ── markdown -> narration text (compact port of the player's processor) ──
function toNarration(title, description, md) {
  const parts = [`You're listening to: ${title}.`, description, "Let's get started."];
  const cleanInline = (s) =>
    s
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  const lines = md.split('\n');
  let i = 0;
  let para = '';
  const headingLead = ['Now, let\'s talk about', 'Moving on to', 'Next up:', "Let's explore", "Now let's look at"];
  let h = 0;
  const flush = () => {
    if (para.trim().length > 10) parts.push(para.trim());
    para = '';
  };

  while (i < lines.length) {
    const t = lines[i].trim();
    if (t.startsWith('```')) {
      flush();
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
      i++;
      continue; // skip code blocks silently
    }
    if (/^\|.*\|$/.test(t)) {
      // markdown table row — read cells as prose, skip separator rows
      if (!/^[\s|:\-]+$/.test(t)) {
        const cells = t.split('|').map((c) => cleanInline(c.trim())).filter(Boolean);
        if (cells.length) para += (para ? ' ' : '') + cells.join(', ') + '.';
      }
      i++;
      continue;
    }
    const hm = t.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      flush();
      const txt = cleanInline(hm[2]);
      parts.push(hm[1].length <= 2 ? `${headingLead[h++ % headingLead.length]} ${txt}.` : `${txt}.`);
      i++;
      continue;
    }
    if (/^[-*_]{3,}$/.test(t)) { flush(); i++; continue; }
    const bm = t.match(/^[-*+]\s+(.+)$/) || t.match(/^\d+\.\s+(.+)$/);
    if (bm) {
      para += (para ? ' ' : '') + cleanInline(bm[1]) + '.';
      i++;
      continue;
    }
    if (t.startsWith('>')) {
      para += (para ? ' ' : '') + cleanInline(t.replace(/^>\s?/, ''));
      i++;
      continue;
    }
    if (!t) { flush(); i++; continue; }
    para += (para ? ' ' : '') + cleanInline(t);
    i++;
  }
  flush();
  parts.push("And that's the end of this article. Thanks for listening.");
  return parts.join('\n\n');
}

function ffprobeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    return Math.round(parseFloat(out.trim()));
  } catch {
    return null;
  }
}

// ── main ──
const args = process.argv.slice(2);
let slugs;
if (args.includes('--all')) {
  slugs = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
} else if (args.includes('--flagship') || args.length === 0) {
  slugs = FLAGSHIP;
} else {
  slugs = args;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

for (const slug of slugs) {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.error(`✗ no such post: ${slug}`);
    continue;
  }
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  if (data.published === false) {
    console.log(`- skipping unpublished: ${slug}`);
    continue;
  }
  const narration = toNarration(data.title || slug, data.description || '', content);
  const txtFile = path.join(os.tmpdir(), `${slug}.txt`);
  const rawFile = path.join(os.tmpdir(), `${slug}-raw.mp3`);
  const outFile = path.join(OUT_DIR, `${slug}.mp3`);
  const srtFile = path.join(OUT_DIR, `${slug}.srt`);
  fs.writeFileSync(txtFile, narration);

  console.log(`▸ generating ${slug} (${narration.split(/\s+/).length} words)…`);
  execFileSync('python3', ['-m', 'edge_tts', '--file', txtFile, '--voice', VOICE, '--rate', RATE, '--write-media', rawFile, '--write-subtitles', srtFile], { stdio: ['ignore', 'ignore', 'inherit'] });
  // 32kbps mono keeps voice quality while shrinking ~40%
  execFileSync('ffmpeg', ['-y', '-i', rawFile, '-ac', '1', '-b:a', '32k', outFile], { stdio: ['ignore', 'ignore', 'pipe'] });
  fs.unlinkSync(rawFile);
  fs.unlinkSync(txtFile);

  const duration = ffprobeDuration(outFile);
  const sizeKB = Math.round(fs.statSync(outFile).size / 1024);
  manifest[slug] = { file: `/audio/${slug}.mp3`, captions: `/audio/${slug}.srt`, duration, voice: VOICE, sizeKB };
  console.log(`  ✓ ${sizeKB} KB, ${duration ? Math.round(duration / 60) + ' min' : '?'}, subtitles ✓`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${Object.keys(manifest).length} posts with audio → public/audio/manifest.json`);
