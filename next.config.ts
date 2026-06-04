import type { NextConfig } from "next";

// Real product images can be served two ways:
//  1. Bundled local files under /public/images (the default catalog), and
//  2. Admin-uploaded files in the Supabase Storage `catalog-images` bucket,
//     which resolve to `https://<project>.supabase.co/storage/v1/object/...`.
//
// next/image refuses to optimize a remote host unless it is allow-listed, so
// derive the Supabase host from the public env var (when present) and also
// accept any `*.supabase.co` storage URL as a fallback. Without this, any
// product whose image_url points at Supabase throws at render time.
const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "**.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
];

if (supabaseHost && !supabaseHost.endsWith(".supabase.co")) {
  // Self-hosted / custom-domain Supabase: add its exact host too.
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
    pathname: "/storage/v1/object/public/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  turbopack: {
    // Keep Turbopack scoped to this app even though /Users/kareemo/Projects has
    // its own package-lock.json. Without this, Next.js may infer the parent
    // folder as the workspace root and print a build warning.
    root: process.cwd(),
  },
};

export default nextConfig;
