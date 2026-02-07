import { getAllPosts, type BlogMeta } from './blog';

export interface BlogIndexEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

let cachedIndex: BlogIndexEntry[] | null = null;

export function getBlogIndex(): BlogIndexEntry[] {
  if (cachedIndex) return cachedIndex;

  const posts = getAllPosts();
  cachedIndex = posts.map((p: BlogMeta) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags,
  }));
  return cachedIndex;
}

const TOPIC_MAP: Record<string, string[]> = {
  'Quantum Computing': ['quantum', 'qubit', 'qauth', 'quantum-shield', 'psqa'],
  'AI & ML': ['ai', 'ml', 'machine-learning', 'deep-learning', 'neural', 'llm', 'gpt', 'claude', 'fomoa'],
  'Backend Engineering': ['backend', 'api', 'fastapi', 'django', 'flask', 'node', 'server', 'rest', 'graphql'],
  'Microservices': ['microservice', 'event-driven', 'kafka', 'distributed', 'grpc', 'message-queue'],
  'Databases': ['database', 'postgresql', 'postgres', 'mongodb', 'redis', 'sql', 'dynamodb', 'connection-pool'],
  'DevOps': ['docker', 'kubernetes', 'k8s', 'ci-cd', 'nginx', 'deployment', 'devops', 'cloud'],
  'Web Dev': ['react', 'next', 'typescript', 'javascript', 'frontend', 'css', 'web'],
};

export function getBlogsByTopic(): Record<string, BlogIndexEntry[]> {
  const index = getBlogIndex();
  const result: Record<string, BlogIndexEntry[]> = {};

  for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
    result[topic] = index.filter((post) => {
      const searchText = `${post.slug} ${post.title} ${post.description} ${post.tags.join(' ')}`.toLowerCase();
      return keywords.some((kw) => searchText.includes(kw));
    });
  }

  return result;
}
