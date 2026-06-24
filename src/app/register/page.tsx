import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { REGISTRATION_OTP_ENABLED } from "@/lib/env";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Napoli 7 account.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Account"
        heading="Register"
        intro="Save addresses and order history with one account."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-md mx-auto">
          <RegisterForm otpEnabled={REGISTRATION_OTP_ENABLED} />
        </div>
      </section>
    </SiteShell>
  );
}
