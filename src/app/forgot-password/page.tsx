import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a Napoli 7 password reset link.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Account"
        heading="Forgot password"
        intro="We&apos;ll send you a link to get back in."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-md mx-auto">
          <ForgotPasswordForm />
        </div>
      </section>
    </SiteShell>
  );
}
