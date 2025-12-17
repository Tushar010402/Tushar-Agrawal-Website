// API client for blog backend

import type { Blog, Comment, CommentCreate, LoginRequest, LoginResponse, BlogCreate, BlogUpdate } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  private getAuthHeader(): HeadersInit {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
    return {};
  }

  // Public Blog Endpoints
  async getAllBlogs(): Promise<Blog[]> {
    return this.request<Blog[]>('/api/blogs');
  }

  async getBlogBySlug(slug: string): Promise<Blog> {
    return this.request<Blog>(`/api/blogs/slug/${slug}`);
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    const encodedQuery = encodeURIComponent(query);
    return this.request<Blog[]>(`/api/blogs/search?q=${encodedQuery}`);
  }

  async getBlogComments(blogId: number): Promise<Comment[]> {
    return this.request<Comment[]>(`/api/blogs/${blogId}/comments`);
  }

  async createComment(data: CommentCreate): Promise<Comment> {
    return this.request<Comment>('/api/blogs/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token in localStorage
    if (typeof window !== 'undefined' && response.access_token) {
      localStorage.setItem('auth_token', response.access_token);
    }

    return response;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Admin Blog Endpoints
  async createBlog(data: BlogCreate): Promise<Blog> {
    return this.request<Blog>('/api/blogs', {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
  }

  async updateBlog(id: number, data: BlogUpdate): Promise<Blog> {
    return this.request<Blog>(`/api/blogs/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
  }

  async deleteBlog(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/blogs/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
  }

  async getBlogById(id: number): Promise<Blog> {
    return this.request<Blog>(`/api/blogs/${id}`, {
      headers: this.getAuthHeader(),
    });
  }

  // Admin Comment Endpoints
  async approveComment(id: number): Promise<Comment> {
    return this.request<Comment>(`/api/blogs/comments/${id}/approve`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
    });
  }

  async deleteComment(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/blogs/comments/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
  }

  // Helper method to check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  }
}

// Export singleton instance
export const api = new APIClient();

// Export class for testing purposes
export { APIClient };

// Convenience exports for common operations
export const blogAPI = {
  getAll: () => api.getAllBlogs(),
  getBySlug: (slug: string) => api.getBlogBySlug(slug),
  search: (query: string) => api.searchBlogs(query),
  getComments: (blogId: number) => api.getBlogComments(blogId),
  createComment: (data: CommentCreate) => api.createComment(data),
};

export const adminBlogAPI = {
  create: (data: BlogCreate) => api.createBlog(data),
  update: (id: number, data: BlogUpdate) => api.updateBlog(id, data),
  delete: (id: number) => api.deleteBlog(id),
  getById: (id: number) => api.getBlogById(id),
};

export const adminCommentAPI = {
  approve: (id: number) => api.approveComment(id),
  delete: (id: number) => api.deleteComment(id),
};

export const authAPI = {
  login: (credentials: LoginRequest) => api.login(credentials),
  logout: () => api.logout(),
  isAuthenticated: () => api.isAuthenticated(),
};
