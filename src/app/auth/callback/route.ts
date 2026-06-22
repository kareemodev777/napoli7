import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSafeRecoveryPath } from "@/lib/auth/password-reset";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = isSafeRecoveryPath(url.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, url.origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(redirectUrl, 303);
  }

  const response = NextResponse.redirect(redirectUrl, 303);
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const code = url.searchParams.get("code");
  if (!code) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("password-reset", "invalid");
    return NextResponse.redirect(loginUrl, 303);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("password-reset", "invalid");
    return NextResponse.redirect(loginUrl, 303);
  }

  return response;
}
