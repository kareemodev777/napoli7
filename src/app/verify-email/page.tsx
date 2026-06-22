import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Check your inbox to confirm your Napoli 7 account.",
  alternates: { canonical: "/verify-email" },
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <SiteShell>
      <PageHero
        eyebrow="Account"
        heading="Verify your email"
        intro="We sent a confirmation link to finish creating your Napoli 7 account."
      />

      <section className="px-6 md:px-10 py-12">
        <div className="max-w-md mx-auto rounded-3xl border border-border/70 bg-card/90 p-6 md:p-8 shadow-sm space-y-5">
          {email ? (
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{email}</span>
            </div>
          ) : null}

          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Open the email and tap the confirmation link once.</p>
            <p>If you do not see it within a minute, check Spam or Junk.</p>
            <p>Once verified, you can log in and start ordering right away.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-brand text-primary-foreground px-5 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-brand-hover"
            >
              Go to login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center border border-border px-5 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-muted"
            >
              Back to register
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}