// Type definitions matching backend API schemas

export interface Blog {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  author: string | null;
  tags: string;
  image_url: string | null;
  published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  readingTime?: string;
}

export interface Comment {
  id: number;
  blog_id: number;
  author_name: string;
  author_email: string | null;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface BlogCreate {
  title: string;
  description: string;
  content: string;
  tags?: string;
  image_url?: string;
  published?: boolean;
}

export interface BlogUpdate {
  title?: string;
  description?: string;
  content?: string;
  tags?: string;
  image_url?: string;
  published?: boolean;
}

export interface CommentCreate {
  blog_id: number;
  author_name: string;
  author_email?: string;
  content: string;
}

export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface APIError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
