"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { PASSWORD_CHANGE_PATH, PASSWORD_FORGOT_PATH } from "@/lib/auth/password-reset";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Password-recovery links frequently fall back to the Site URL (the homepage)
 * instead of our /auth/callback route: this happens whenever the link arrives
 * with the token in the URL hash (implicit flow) or the redirect target is not
 * allow-listed in the Supabase dashboard. The hash never reaches the server, so
 * the server-side handlers in page.tsx / auth/callback can't act on it and the
 * visitor is stranded on whatever page they landed on.
 *
 * This guard runs on every page. The browser client consumes the recovery hash
 * (detectSessionInUrl) and emits PASSWORD_RECOVERY, at which point we forward to
 * the change-password screen. Expired or already-used links come back as an
 * error in the hash with no session, so we read that directly and send the user
 * back to request a fresh link.
 */
export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    // Already on the destination — nothing to route.
    if (pathname === PASSWORD_CHANGE_PATH) return;

    // Instantiate the browser client up front so it consumes any recovery token
    // in the URL hash (detectSessionInUrl) and shares the in-memory session with
    // the change-password screen we route to below.
    const supabase = getBrowserSupabase();

    // Supabase puts recovery params in the URL hash (implicit flow) but expired
    // links can also surface them in the query string — e.g. it lands on
    // `/?error=access_denied&error_code=otp_expired#error=access_denied...`.
    // Read both so neither shape strands the user.
    const params = new URLSearchParams();
    for (const part of [window.location.search, window.location.hash]) {
      if (part.length > 1) {
        new URLSearchParams(part.slice(1)).forEach((value, key) => {
          params.set(key, value);
        });
      }
    }

    // Expired / already-used links arrive as `error=access_denied` with no
    // session — send the user back for a fresh link.
    if (params.get("error")) {
      router.replace(`${PASSWORD_FORGOT_PATH}?expired=1`);
      return;
    }
    // A valid recovery token: forward straight to the change-password screen.
    if (params.get("type") === "recovery") {
      router.replace(PASSWORD_CHANGE_PATH);
      return;
    }

    // Fallback: the recovery event may arrive slightly after mount (or via a
    // PKCE exchange elsewhere), so listen for it too.
    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace(PASSWORD_CHANGE_PATH);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
