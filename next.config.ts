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
      // URLs the old llm.txt advertised that never existed — Google crawled them
      // and reported 404s in GSC. 301 to the real equivalents.
      { source: '/blog/building-scalable-microservices-with-go-and-fastapi-a-complete-guide', destination: '/blog/building-scalable-microservices-with-go-and-fastapi', permanent: true },
      { source: '/blog/hipaa-compliant-healthcare-saas-security-best-practices-for-2025', destination: '/blog/hipaa-compliance-healthcare-saas', permanent: true },
      { source: '/blog/ai-powered-ocr-for-medical-reports-reducing-manual-errors-by-90', destination: '/blog/healthcare-technology-dr-dangs-lab', permanent: true },
      { source: '/blog/event-driven-architecture-with-kafka-real-time-inventory-management', destination: '/blog/event-driven-architecture-kafka', permanent: true },
      { source: '/blog/zero-downtime-deployment-with-docker-and-nginx-from-4-hours-to-20-minutes', destination: '/blog/docker-kubernetes-deployment-guide', permanent: true },
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
          {
            // NOTE: this app relies on inline styles (the whole theme uses
            // style={{}} with CSS vars) and Next.js injects inline bootstrap
            // scripts — so script-src/style-src MUST allow 'unsafe-inline'.
            // The hardening value is in the object/base/frame/form directives,
            // which close real vectors without breaking anything.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "media-src 'self'",
              "connect-src 'self' https:",
              "frame-src 'self' https://giscus.app",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
