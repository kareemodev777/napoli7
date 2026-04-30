import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Napoli 7 account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
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
