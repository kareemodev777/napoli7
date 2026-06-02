import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this app even though /Users/kareemo/Projects has
    // its own package-lock.json. Without this, Next.js may infer the parent
    // folder as the workspace root and print a build warning.
    root: process.cwd(),
  },
};

export default nextConfig;
