import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.openai.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        port: '',
        pathname: '/**',
      }
    ],
    // Add fallback options
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Disable image optimization for external URLs if needed
    unoptimized: false,
  },
};

export default nextConfig;
