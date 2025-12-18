import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');

// Ensure drafts directory exists
function ensureDraftsDir() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

// GET - List all drafts
export async function GET() {
  try {
    ensureDraftsDir();

    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));

    const drafts = files.map(filename => {
      const filepath = path.join(DRAFTS_DIR, filename);
      const content = fs.readFileSync(filepath, 'utf-8');

      // Parse frontmatter
      const titleMatch = content.match(/title:\s*["'](.+?)["']/);
      const descMatch = content.match(/description:\s*["'](.+?)["']/);
      const dateMatch = content.match(/date:\s*["'](.+?)["']/);
      const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/);

      // Extract content after frontmatter
      const contentMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/);

      return {
        filename,
        title: titleMatch?.[1] || filename.replace('.md', ''),
        description: descMatch?.[1] || '',
        date: dateMatch?.[1] || '',
        tags: tagsMatch?.[1]?.split(',').map(t => t.trim().replace(/["']/g, '')) || [],
        content: contentMatch?.[1]?.trim() || '',
      };
    });

    // Sort by date descending
    drafts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Error listing drafts:', error);
    return NextResponse.json({ error: 'Failed to list drafts' }, { status: 500 });
  }
}

// POST - Save a new draft
export async function POST(request: NextRequest) {
  try {
    ensureDraftsDir();

    const { title, description, tags, content, slug } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const date = new Date().toISOString().split('T')[0];
    const finalSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);

    const frontmatter = `---
title: "${title}"
description: "${description || `Learn about ${title}`}"
date: "${date}"
author: "Tushar Agrawal"
tags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
published: false
draft: true
---

${content}
`;

    const filename = `${finalSlug}.md`;
    const filepath = path.join(DRAFTS_DIR, filename);

    fs.writeFileSync(filepath, frontmatter);

    return NextResponse.json({
      success: true,
      filename,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

// DELETE - Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const filepath = path.join(DRAFTS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    fs.unlinkSync(filepath);

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
