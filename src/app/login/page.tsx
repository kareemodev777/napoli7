import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
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
    <SiteShell>
      <PageHero eyebrow="Account" heading="Log in" intro="Welcome back." />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-md mx-auto">
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
          >
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
