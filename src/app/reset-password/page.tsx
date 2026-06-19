import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new Napoli 7 account password.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Account"
        heading="Reset password"
        intro="Pick a new password for your Napoli 7 account."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-md mx-auto">
          <ResetPasswordForm />
        </div>
      </section>
    </SiteShell>
  );
}
