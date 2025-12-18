import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

// POST - Publish a draft
export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const draftPath = path.join(DRAFTS_DIR, filename);

    if (!fs.existsSync(draftPath)) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Read draft content
    let content = fs.readFileSync(draftPath, 'utf-8');

    // Update frontmatter: set published to true and remove draft flag
    content = content
      .replace(/published:\s*false/, 'published: true')
      .replace(/draft:\s*true\n?/, '');

    // Ensure blog directory exists
    if (!fs.existsSync(BLOG_DIR)) {
      fs.mkdirSync(BLOG_DIR, { recursive: true });
    }

    // Write to blog directory
    const publishedPath = path.join(BLOG_DIR, filename);
    fs.writeFileSync(publishedPath, content);

    // Delete the draft
    fs.unlinkSync(draftPath);

    return NextResponse.json({
      success: true,
      message: 'Blog published successfully',
      path: `/blog/${filename.replace('.md', '')}`
    });
  } catch (error) {
    console.error('Error publishing draft:', error);
    return NextResponse.json({ error: 'Failed to publish draft' }, { status: 500 });
  }
}
