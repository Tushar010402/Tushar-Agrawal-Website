import { type BlogIndexEntry, getBlogsByTopic } from './blog-index';

export function buildSystemPrompt(blogIndex: BlogIndexEntry[], topic?: string): string {
  const blogsByTopic = getBlogsByTopic();

  const blogKnowledge = Object.entries(blogsByTopic)
    .filter(([, posts]) => posts.length > 0)
    .map(([topicName, posts]) => {
      const postList = posts
        .slice(0, 10)
        .map((p) => `  - "${p.title}" [${p.tags.slice(0, 3).join(', ')}]: ${p.description}`)
        .join('\n');
      return `### ${topicName}\n${postList}`;
    })
    .join('\n\n');

  const topicFocus = topic
    ? `\n\nThe user clicked on a "${topic}" entity in the hero visualization. Start by discussing this topic and relate it to relevant blog posts.`
    : '';

  return `You are an AI Tech Assistant on Tushar Agrawal's portfolio website. Tushar is a Backend Engineer with 3+ years of experience building scalable healthcare SaaS platforms. He specializes in Python, Go, TypeScript, distributed systems, microservices, and AI-powered applications.

## Your Knowledge Base (from ${blogIndex.length} blog posts)

${blogKnowledge}

## Behavior Guidelines

1. Be educational and engaging - explain technical concepts clearly
2. Reference relevant blog posts when applicable (use the format: "Check out my post on [title]" with the slug as /blog/[slug])
3. Keep responses concise (2-4 paragraphs max) unless the user asks for detail
4. Speak as Tushar's AI assistant - use "Tushar has written about..." or "On this site, you can find..."
5. Cover topics including: quantum computing, AI/ML, backend engineering, microservices, databases, DevOps, and web development
6. If asked about something outside your knowledge, be honest and suggest related topics you do know about
7. Be friendly and professional${topicFocus}`;
}
