/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@web': __dirname,
      '@db': require('path').resolve(__dirname, '../../packages/db'),
      '@llm': require('path').resolve(__dirname, '../../packages/llm'),
      '@pdfkit': require('path').resolve(__dirname, '../../packages/pdfkit'),
      '@ocr': require('path').resolve(__dirname, '../../packages/ocr'),
      '@policy': require('path').resolve(__dirname, '../../packages/policy'),
    };
    return config;
  },
};

module.exports = nextConfig;
