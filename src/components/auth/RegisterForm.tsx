"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  sendRegistrationOtp,
  verifyAndRegister,
  registerDirect,
} from "@/app/register/actions";
import type { SignupReward } from "@/lib/signup-reward";

type Step = "details" | "code" | "done";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

export function RegisterForm({ otpEnabled = true }: { otpEnabled?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reward, setReward] = useState<SignupReward | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Step 1 → validate + anti-abuse checks server-side. When OTP is enabled we
  // text a code and move to the verify step; when it's disabled (no Twilio) we
  // create the account directly so registration is never blocked.
  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (!otpEnabled) {
        const res = await registerDirect(form);
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.reward) {
          setReward(res.reward);
          setStep("done");
          return;
        }
        router.push(
          `/verify-email?email=${encodeURIComponent(form.email.trim())}`,
        );
        return;
      }
      const res = await sendRegistrationOtp(form);
      if (res.error) {
        setError(res.error);
        return;
      }
      setNotice("We texted a 6-digit code to your mobile. Enter it below.");
      setStep("code");
    });
  }

  // Step 2 → verify the texted code (proves the number is real), create the
  // account, and claim the launch offer.
  function verifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyAndRegister(form, code.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.reward) {
        setReward(res.reward);
        setStep("done");
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
    });
  }

  if (step === "done" && reward) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-brand/40 bg-brand/5 p-5 text-center">
          <p className="font-display text-xs uppercase tracking-[0.24em] text-brand">
            Welcome gift · claimant #{reward.claimNumber}
          </p>
          <p className="mt-2 text-base text-foreground">
            You scored a free{" "}
            <span className="font-semibold">{reward.rewardName}</span>!
          </p>
          <p className="mt-3 font-mono text-2xl tracking-[0.12em] text-foreground">
            {reward.code}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Apply this code in the cart on your first order. It works once and is
            tied to your account — we&rsquo;ve also emailed it to you.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/verify-email?email=${encodeURIComponent(form.email.trim())}`,
            )
          }
          className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
        >
          Verify your email to finish
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "details" ? sendCode : verifyAndCreate}
      className="space-y-5"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field id="reg-firstName" label="First name" required>
          <Input
            id="reg-firstName"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
            disabled={step === "code"}
          />
        </Field>
        <Field id="reg-lastName" label="Last name" required>
          <Input
            id="reg-lastName"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
            disabled={step === "code"}
          />
        </Field>
      </div>
      <Field id="reg-email" label="Email" required>
        <Input
          id="reg-email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          autoComplete="email"
          disabled={step === "code"}
        />
      </Field>
      <Field
        id="reg-mobile"
        label="Mobile number"
        required
        hint={
          otpEnabled
            ? "UAE mobile starting with +9715. We'll text a code to verify it."
            : "UAE mobile starting with +9715."
        }
      >
        <Input
          id="reg-mobile"
          type="tel"
          value={form.mobile}
          onChange={(e) => update("mobile", e.target.value)}
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="+9715XXXXXXXX"
          pattern="^\+9715[0-9]{8}$"
          disabled={step === "code"}
        />
      </Field>
      <Field
        id="reg-password"
        label="Password"
        required
        hint="At least 8 characters."
      >
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="pr-10"
            disabled={step === "code"}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-0 top-0 h-full w-10 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>
      </Field>
      <Field id="reg-confirm" label="Confirm password" required>
        <Input
          id="reg-confirm"
          type={showPassword ? "text" : "password"}
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          required
          autoComplete="new-password"
          disabled={step === "code"}
        />
      </Field>

      {step === "code" ? (
        <Field
          id="reg-code"
          label="SMS code"
          required
          hint="6-digit code we texted to your mobile."
        >
          <Input
            id="reg-code"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="123456"
            autoComplete="one-time-code"
          />
        </Field>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice && step === "code" ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
      >
        {pending
          ? step === "details"
            ? otpEnabled
              ? "Sending code…"
              : "Creating…"
            : "Verifying…"
          : step === "details"
            ? otpEnabled
              ? "Send verification code"
              : "Create account"
            : "Verify & create account"}
      </button>

      {step === "code" ? (
        <button
          type="button"
          onClick={() => {
            setStep("details");
            setCode("");
            setError(null);
            setNotice(null);
          }}
          className="block w-full text-center text-sm text-muted-foreground hover:underline underline-offset-4"
        >
          Use a different number
        </button>
      ) : null}

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground hover:underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="font-display text-xs tracking-[0.2em] uppercase"
      >
        {label}
        {required ? (
          <span aria-hidden className="text-flag-red">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
