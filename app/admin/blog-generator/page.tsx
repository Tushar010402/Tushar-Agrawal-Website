'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/ui/navbar';
import {
  Sparkles,
  FileText,
  Send,
  Trash2,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Copy,
} from 'lucide-react';

interface Draft {
  filename: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: string;
}

interface GeneratedBlog {
  title: string;
  description: string;
  tags: string[];
  content: string;
  slug: string;
}

const TOPIC_SUGGESTIONS = [
  'Redis caching strategies for high performance',
  'PostgreSQL query optimization techniques',
  'Building scalable REST APIs with FastAPI',
  'Kubernetes networking deep dive',
  'Event sourcing and CQRS patterns',
  'API security best practices',
  'GraphQL vs REST: When to use what',
  'WebAssembly for backend developers',
  'gRPC vs REST performance comparison',
  'Database sharding strategies',
  'Circuit breaker pattern implementation',
  'Zero trust architecture implementation',
];

export default function BlogGeneratorPage() {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlog, setGeneratedBlog] = useState<GeneratedBlog | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'drafts'>('generate');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);

  // Fetch drafts on load
  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/blog/drafts');
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.drafts || []);
      }
    } catch {
      console.error('Failed to fetch drafts');
    }
  };

  const generateBlog = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedBlog(null);

    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate blog');
      }

      setGeneratedBlog(data);
      setSuccess('Blog generated successfully! Review it below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!generatedBlog) return;

    try {
      const response = await fetch('/api/blog/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedBlog),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setSuccess('Draft saved successfully!');
      setGeneratedBlog(null);
      setTopic('');
      fetchDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const publishDraft = async (filename: string) => {
    try {
      const response = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish draft');
      }

      setSuccess('Blog published successfully!');
      fetchDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const deleteDraft = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await fetch(`/api/blog/drafts?filename=${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      setSuccess('Draft deleted');
      fetchDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const useSuggestion = (suggestion: string) => {
    setTopic(suggestion);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              AI Blog Generator
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Generate technical blog posts using Google Gemini AI
          </p>
        </motion.div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              ×
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
              ×
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-900 text-gray-400 hover:bg-neutral-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Generate New
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'drafts'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-900 text-gray-400 hover:bg-neutral-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Drafts ({drafts.length})
          </button>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-8">
            {/* Topic Input */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Blog Topic
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Redis caching strategies for high performance"
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
                <button
                  onClick={generateBlog}
                  disabled={isGenerating || !topic.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Topic Suggestions */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h3 className="font-medium text-white">Topic Suggestions</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {TOPIC_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => useSuggestion(suggestion)}
                    className="px-3 py-1.5 bg-neutral-800 text-gray-300 text-sm rounded-lg hover:bg-neutral-700 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Blog Preview */}
            {generatedBlog && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
              >
                <div className="p-6 border-b border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Generated Blog Preview</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedBlog.content)}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-gray-300 rounded-lg hover:bg-neutral-700 transition-all"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={saveDraft}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        Save as Draft
                      </button>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">{generatedBlog.title}</h2>
                  <p className="text-gray-400 mb-4">{generatedBlog.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {generatedBlog.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-sm rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 max-h-[500px] overflow-y-auto">
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-neutral-800 p-4 rounded-lg overflow-x-auto">
                      {generatedBlog.content}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Drafts Yet</h3>
                <p className="text-gray-400 mb-6">Generate your first blog post to get started</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Generate New Blog
                </button>
              </div>
            ) : (
              drafts.map((draft) => (
                <motion.div
                  key={draft.filename}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{draft.title}</h3>
                      <p className="text-gray-400 text-sm mb-3">{draft.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {draft.date}
                        </span>
                        <div className="flex gap-1">
                          {draft.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-neutral-800 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedDraft(draft)}
                        className="p-2 bg-neutral-800 text-gray-300 rounded-lg hover:bg-neutral-700 transition-all"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => publishDraft(draft.filename)}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        title="Publish"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDraft(draft.filename)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Draft Preview Modal */}
        {selectedDraft && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">{selectedDraft.title}</h3>
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                  {selectedDraft.content}
                </pre>
              </div>
              <div className="p-4 border-t border-neutral-700 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="px-4 py-2 bg-neutral-800 text-gray-300 rounded-lg hover:bg-neutral-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    publishDraft(selectedDraft.filename);
                    setSelectedDraft(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Publish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
