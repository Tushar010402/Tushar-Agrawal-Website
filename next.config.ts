import type { NextConfig } from "next";

// Retired FOMOA posts consolidated into 3 pillars — 301 so existing links/equity follow.
const FOMOA_PILLAR_1 = '/blog/fomoa-ai-complete-guide-features-2026';
const FOMOA_PILLAR_2 = '/blog/fomoa-openai-compatible-api-developers';
const FOMOA_PILLAR_3 = '/blog/fomoa-vs-exa-ai-comparison';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Pillar 1 — overview / India-first / training / Hindi / credibility
      { source: '/blog/india-first-ai-search-engine-fomoa', destination: FOMOA_PILLAR_1, permanent: true },
      { source: '/blog/fomoa-training-86k-samples-india-ai', destination: FOMOA_PILLAR_1, permanent: true },
      { source: '/blog/fomoa-hindi-hinglish-ai-assistant', destination: FOMOA_PILLAR_1, permanent: true },
      { source: '/blog/fomoa-source-credibility-ranking-system', destination: FOMOA_PILLAR_1, permanent: true },
      // Pillar 2 — developer API / research / crawling / entity search
      { source: '/blog/fomoa-deep-research-multi-hop-ai', destination: FOMOA_PILLAR_2, permanent: true },
      { source: '/blog/fomoa-ethical-web-crawling-api', destination: FOMOA_PILLAR_2, permanent: true },
      { source: '/blog/fomoa-startup-company-funding-search', destination: FOMOA_PILLAR_2, permanent: true },
      // Pillar 3 — comparison / government schemes / students
      { source: '/blog/fomoa-ai-indian-government-schemes-benefits', destination: FOMOA_PILLAR_3, permanent: true },
      { source: '/blog/indian-government-schemes-ai-search', destination: FOMOA_PILLAR_3, permanent: true },
      { source: '/blog/fomoa-ai-indian-students-jee-neet-upsc-2026', destination: FOMOA_PILLAR_3, permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
