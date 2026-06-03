import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Fully static export — the app is a client-rendered SPA that talks to the
  // bandup-server API. Deployed to Cloudflare as static assets (see wrangler.jsonc).
  output: "export",
  // next/image can't use the optimization server in a static export.
  images: { unoptimized: true },
}

export default nextConfig
