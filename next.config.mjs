/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export served as Cloudflare Workers static assets (see wrangler.jsonc).
  // Deployed at the domain root, so no basePath/assetPrefix.
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Required for output: export; no image optimization server.
    unoptimized: true,
  },
};

export default nextConfig;
