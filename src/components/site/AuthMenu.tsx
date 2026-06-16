"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";

type AuthState = "loading" | "in" | "out";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Resolves the signed-in state on the client so the surrounding pages can stay
 * statically rendered (reading auth cookies in a Server Component would force
 * every page that renders the header to become dynamic). When Supabase is not
 * configured we start (and stay) "out" so no effect setState is needed.
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(
    SUPABASE_CONFIGURED ? "loading" : "out",
  );

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = getBrowserSupabase();

    let active = true;
    supabase.auth
      .getUser()
      .then((res: { data: { user: unknown | null } }) => {
        if (active) setState(res.data.user ? "in" : "out");
      });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setState(session?.user ? "in" : "out");
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Desktop header auth control: Sign in, or Account + Sign out. */
export function AuthMenu() {
  const state = useAuthState();

  if (state === "in") {
    return (
      <div className="hidden lg:flex items-center gap-5">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 hover:opacity-60"
        >
          <User className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          Account
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 hover:opacity-60"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    );
  }

  if (state === "out") {
    return (
      <Link
        href="/login"
        className="hidden lg:inline-flex items-center gap-1.5 hover:opacity-60"
      >
        <User className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        Sign in
      </Link>
    );
  }

  // Loading — show a neutral account icon to avoid a flash / layout shift.
  return (
    <Link
      href="/account"
      aria-label="Account"
      className="hidden lg:inline-flex hover:opacity-60"
    >
      <User className="h-5 w-5" strokeWidth={1.5} aria-hidden />
    </Link>
  );
}
