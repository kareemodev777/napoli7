import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { isAdminUser, isAdminPath } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Napoli 7 account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in? Don't show the login form again — send the user on.
  // This fixes the profile icon prompting for login when a session exists.
  const user = await getCurrentUser();
  if (user) {
    const { next } = await searchParams;
    if (await isAdminUser(user)) {
      redirect(isAdminPath(next) ? next! : "/admin");
    }
    redirect(next && !isAdminPath(next) ? next : "/account");
  }

  return (
    <AuthShell
      heading="Log in"
      intro="Welcome back. Sign in to track orders and save your addresses."
    >
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
