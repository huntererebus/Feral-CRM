/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Subdomains carry the organization slug (see src/middleware.ts). No
  // rewrite config needed here — resolution happens per-request in
  // middleware, not via static Next.js routing.
};

export default nextConfig;
