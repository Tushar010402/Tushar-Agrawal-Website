#!/usr/bin/env npx ts-node

/**
 * AI Blog Generator using Google Gemini API
 *
 * Usage:
 *   npx ts-node scripts/generate-blog.ts [topic]
 *   npx ts-node scripts/generate-blog.ts --suggest
 *   npx ts-node scripts/generate-blog.ts --list-drafts
 *
 * Examples:
 *   npx ts-node scripts/generate-blog.ts "Redis caching strategies"
 *   npx ts-node scripts/generate-blog.ts --suggest
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

// ES Module support for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'blog');
const DRAFTS_DIR = path.join(__dirname, '..', 'content', 'drafts');

// Ensure directories exist
if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

// Topic categories for suggestions
const TOPIC_CATEGORIES = {
  'Backend Development': [
    'Building scalable REST APIs with FastAPI',
    'GraphQL vs REST: When to use what',
    'Rate limiting strategies for APIs',
    'Database connection pooling best practices',
    'Implementing API versioning',
    'Error handling patterns in backend systems',
    'Building webhook systems',
    'API gateway patterns',
  ],
  'Cloud & DevOps': [
    'AWS Lambda best practices',
    'Terraform vs Pulumi comparison',
    'Kubernetes networking deep dive',
    'GitOps with ArgoCD',
    'Container security best practices',
    'Cloud cost optimization strategies',
    'Blue-green deployment strategies',
    'Infrastructure monitoring with Prometheus',
  ],
  'Database & Caching': [
    'Redis caching strategies for high performance',
    'PostgreSQL query optimization techniques',
    'Database sharding strategies',
    'Time-series databases comparison',
    'Implementing distributed caching',
    'Database migration strategies',
    'Connection pooling with PgBouncer',
    'Vector databases for AI applications',
  ],
  'System Design': [
    'Designing a URL shortener system',
    'Building a real-time notification system',
    'Designing a rate limiter',
    'Event sourcing and CQRS patterns',
    'Designing a distributed cache',
    'Building a job queue system',
    'Designing a search autocomplete system',
    'Circuit breaker pattern implementation',
  ],
  'Security': [
    'Implementing OAuth 2.0 from scratch',
    'API security best practices',
    'Secrets management in Kubernetes',
    'Zero trust architecture implementation',
    'Web application firewall configuration',
    'SQL injection prevention techniques',
    'Secure session management',
    'CORS deep dive',
  ],
  'Modern Technologies': [
    'WebAssembly for backend developers',
    'gRPC vs REST performance comparison',
    'Server-sent events vs WebSockets',
    'Edge computing with Cloudflare Workers',
    'Building with Deno 2.0',
    'Bun runtime deep dive',
    'AI agents in backend systems',
    'OpenTelemetry implementation guide',
  ],
};

// Existing blog topics to avoid duplicates
function getExistingTopics(): string[] {
  const topics: string[] = [];

  // Check published blogs
  if (fs.existsSync(CONTENT_DIR)) {
    fs.readdirSync(CONTENT_DIR).forEach(file => {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
        const titleMatch = content.match(/title:\s*["'](.+?)["']/);
        if (titleMatch) {
          topics.push(titleMatch[1].toLowerCase());
        }
      }
    });
  }

  // Check drafts
  if (fs.existsSync(DRAFTS_DIR)) {
    fs.readdirSync(DRAFTS_DIR).forEach(file => {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf-8');
        const titleMatch = content.match(/title:\s*["'](.+?)["']/);
        if (titleMatch) {
          topics.push(titleMatch[1].toLowerCase());
        }
      }
    });
  }

  return topics;
}

// Generate blog using Gemini API
async function generateBlogContent(topic: string): Promise<{ title: string; content: string; slug: string; tags: string[]; description: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
  }

  const prompt = `You are Tushar Agrawal, a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms. You specialize in Python, Go, FastAPI, Django, PostgreSQL, Redis, Docker, Kubernetes, and microservices architecture.

Write a comprehensive technical blog post about: "${topic}"

Requirements:
1. Write in first person from Tushar's perspective
2. Include practical code examples (Python, Go, TypeScript, or relevant language)
3. Add ASCII diagrams where helpful
4. Include real-world use cases and best practices
5. Make it SEO-optimized with proper headings (##, ###)
6. Length: 1500-2500 words
7. Include a "Key Takeaways" section at the end
8. Add "Related Articles" section suggesting 2-3 related topics

Output Format (IMPORTANT - follow exactly):
---TITLE---
[Catchy, SEO-friendly title - 50-60 characters]
---DESCRIPTION---
[SEO meta description - 150-160 characters]
---TAGS---
[Comma-separated tags, e.g., Python, FastAPI, Redis, Caching, Performance]
---CONTENT---
[Full markdown content starting with ## Introduction]

Write the blog now:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error('No content generated');
  }

  // Parse the response
  const titleMatch = generatedText.match(/---TITLE---\s*([\s\S]*?)---DESCRIPTION---/);
  const descMatch = generatedText.match(/---DESCRIPTION---\s*([\s\S]*?)---TAGS---/);
  const tagsMatch = generatedText.match(/---TAGS---\s*([\s\S]*?)---CONTENT---/);
  const contentMatch = generatedText.match(/---CONTENT---\s*([\s\S]*)/);

  const title = titleMatch?.[1]?.trim() || topic;
  const description = descMatch?.[1]?.trim() || `Learn about ${topic} with practical examples and best practices.`;
  const tags = tagsMatch?.[1]?.trim().split(',').map((t: string) => t.trim()) || [topic];
  const content = contentMatch?.[1]?.trim() || generatedText;

  // Generate slug
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);

  return { title, content, slug, tags, description };
}

// Save blog as draft
function saveDraft(blog: { title: string; content: string; slug: string; tags: string[]; description: string }): string {
  const date = new Date().toISOString().split('T')[0];
  const frontmatter = `---
title: "${blog.title}"
description: "${blog.description}"
date: "${date}"
author: "Tushar Agrawal"
tags: [${blog.tags.map(t => `"${t}"`).join(', ')}]
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
published: false
draft: true
---

${blog.content}
`;

  const filename = `${blog.slug}.md`;
  const filepath = path.join(DRAFTS_DIR, filename);
  fs.writeFileSync(filepath, frontmatter);

  return filepath;
}

// Publish a draft
function publishDraft(draftPath: string): string {
  const content = fs.readFileSync(draftPath, 'utf-8');
  const updatedContent = content
    .replace(/published:\s*false/, 'published: true')
    .replace(/draft:\s*true\n?/, '');

  const filename = path.basename(draftPath);
  const publishedPath = path.join(CONTENT_DIR, filename);

  fs.writeFileSync(publishedPath, updatedContent);
  fs.unlinkSync(draftPath);

  return publishedPath;
}

// List all drafts
function listDrafts(): void {
  if (!fs.existsSync(DRAFTS_DIR)) {
    console.log('\n📭 No drafts directory found.\n');
    return;
  }

  const drafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));

  if (drafts.length === 0) {
    console.log('\n📭 No drafts found.\n');
    return;
  }

  console.log('\n📝 Draft Blog Posts:\n');
  drafts.forEach((file, index) => {
    const content = fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf-8');
    const titleMatch = content.match(/title:\s*["'](.+?)["']/);
    const dateMatch = content.match(/date:\s*["'](.+?)["']/);
    console.log(`  ${index + 1}. ${titleMatch?.[1] || file}`);
    console.log(`     📅 ${dateMatch?.[1] || 'Unknown date'}`);
    console.log(`     📁 ${file}\n`);
  });
}

// Suggest topics
function suggestTopics(): void {
  const existingTopics = getExistingTopics();

  console.log('\n💡 Suggested Blog Topics:\n');

  Object.entries(TOPIC_CATEGORIES).forEach(([category, topics]) => {
    console.log(`\n📂 ${category}:`);
    topics.forEach(topic => {
      const isDuplicate = existingTopics.some(existing =>
        existing.includes(topic.toLowerCase().substring(0, 20))
      );
      if (!isDuplicate) {
        console.log(`   • ${topic}`);
      }
    });
  });

  console.log('\n\nUsage: npx ts-node scripts/generate-blog.ts "Your chosen topic"\n');
}

// Interactive prompt
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  console.log('\n🤖 AI Blog Generator - Powered by Google Gemini\n');
  console.log('━'.repeat(50));

  // Handle commands
  if (args.includes('--suggest') || args.includes('-s')) {
    suggestTopics();
    return;
  }

  if (args.includes('--list-drafts') || args.includes('-l')) {
    listDrafts();
    return;
  }

  if (args.includes('--publish') || args.includes('-p')) {
    const draftIndex = args.indexOf('--publish') + 1 || args.indexOf('-p') + 1;
    const draftFile = args[draftIndex];
    if (draftFile) {
      const draftPath = path.join(DRAFTS_DIR, draftFile.endsWith('.md') ? draftFile : `${draftFile}.md`);
      if (fs.existsSync(draftPath)) {
        const publishedPath = publishDraft(draftPath);
        console.log(`✅ Published: ${publishedPath}`);
      } else {
        console.log(`❌ Draft not found: ${draftPath}`);
      }
    } else {
      console.log('Usage: npx ts-node scripts/generate-blog.ts --publish <draft-filename>');
    }
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  npx ts-node scripts/generate-blog.ts [options] [topic]

Options:
  --suggest, -s      Show suggested topics
  --list-drafts, -l  List all draft posts
  --publish, -p      Publish a draft
  --help, -h         Show this help

Examples:
  npx ts-node scripts/generate-blog.ts "Redis caching strategies"
  npx ts-node scripts/generate-blog.ts --suggest
  npx ts-node scripts/generate-blog.ts --list-drafts
  npx ts-node scripts/generate-blog.ts --publish my-blog-slug
`);
    return;
  }

  // Get topic from args or prompt
  let topic = args.filter(a => !a.startsWith('-')).join(' ');

  if (!topic) {
    const rl = createInterface();
    topic = await askQuestion(rl, '📝 Enter blog topic: ');
    rl.close();
  }

  if (!topic) {
    console.log('❌ No topic provided. Use --suggest to see topic ideas.');
    return;
  }

  console.log(`\n🔄 Generating blog about: "${topic}"\n`);
  console.log('⏳ This may take 30-60 seconds...\n');

  try {
    const blog = await generateBlogContent(topic);
    const draftPath = saveDraft(blog);

    console.log('✅ Blog draft generated successfully!\n');
    console.log('━'.repeat(50));
    console.log(`📌 Title: ${blog.title}`);
    console.log(`📝 Description: ${blog.description}`);
    console.log(`🏷️  Tags: ${blog.tags.join(', ')}`);
    console.log(`📁 Saved to: ${draftPath}`);
    console.log('━'.repeat(50));
    console.log('\n📋 Next steps:');
    console.log('   1. Review and edit the draft');
    console.log('   2. Update the image URL');
    console.log(`   3. Publish: npx ts-node scripts/generate-blog.ts --publish ${blog.slug}`);
    console.log('\n');
  } catch (error) {
    console.error('❌ Error generating blog:', error);
  }
}

main().catch(console.error);
