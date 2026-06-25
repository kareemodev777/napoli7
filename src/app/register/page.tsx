import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell
      heading="Create your account"
      intro="It's quick and easy — save addresses and reorder in a tap."
    >
      <RegisterForm otpEnabled={REGISTRATION_OTP_ENABLED} />
    </AuthShell>
  );
}
