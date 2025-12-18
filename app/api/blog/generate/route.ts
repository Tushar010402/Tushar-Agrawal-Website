import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are Tushar Agrawal, a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms. You specialize in Python, Go, FastAPI, Django, PostgreSQL, Redis, Docker, Kubernetes, and microservices architecture.

Write a comprehensive technical blog post about: "${topic}"

Requirements:
1. Write in first person from Tushar's perspective
2. Include practical code examples (Python, Go, TypeScript, or relevant language)
3. Add ASCII diagrams where helpful for architecture/flow explanations
4. Include real-world use cases and best practices
5. Make it SEO-optimized with proper headings (##, ###)
6. Length: 1500-2500 words
7. Include a "Key Takeaways" or "Conclusion" section at the end
8. Add "Related Articles" section suggesting 2-3 related topics that could link to other blog posts

Output Format (IMPORTANT - follow this exact format):
---TITLE---
[Catchy, SEO-friendly title - 50-60 characters max]
---DESCRIPTION---
[SEO meta description - 150-160 characters that summarizes the post]
---TAGS---
[Comma-separated tags, e.g., Python, FastAPI, Redis, Caching, Performance, Backend]
---CONTENT---
[Full markdown content starting with ## Introduction]

Write the comprehensive technical blog now:`;

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
      console.error('Gemini API error:', error);
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json({ error: 'No content generated' }, { status: 500 });
    }

    // Parse the response
    const titleMatch = generatedText.match(/---TITLE---\s*([\s\S]*?)---DESCRIPTION---/);
    const descMatch = generatedText.match(/---DESCRIPTION---\s*([\s\S]*?)---TAGS---/);
    const tagsMatch = generatedText.match(/---TAGS---\s*([\s\S]*?)---CONTENT---/);
    const contentMatch = generatedText.match(/---CONTENT---\s*([\s\S]*)/);

    const title = titleMatch?.[1]?.trim() || topic;
    const description = descMatch?.[1]?.trim() || `Learn about ${topic} with practical examples and best practices.`;
    const tagsString = tagsMatch?.[1]?.trim() || topic;
    const tags = tagsString.split(',').map((t: string) => t.trim()).filter(Boolean);
    const content = contentMatch?.[1]?.trim() || generatedText;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);

    return NextResponse.json({
      title,
      description,
      tags,
      content,
      slug,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
