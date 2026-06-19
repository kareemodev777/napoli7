"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  loginWithPassword,
  sendMagicLink,
  sendPasswordReset,
  sendPhoneOtp,
  verifyPhoneOtp,
  type AuthResult,
} from "@/app/login/actions";

const initial: AuthResult = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const confirmed = params.get("confirmed") === "true";
  const passwordReset = params.get("password-reset") === "true";

  const [mode, setMode] = useState<"password" | "magic" | "reset" | "phone">(
    "password",
  );
  const [showPassword, setShowPassword] = useState(false);

  const [pwState, pwAction, pwPending] = useActionState(
    loginWithPassword,
    initial,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLink,
    initial,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    sendPasswordReset,
    initial,
  );

  return (
    <div className="space-y-6">
      {confirmed ? (
        <Alert>
          <AlertDescription>
            Email confirmed. You can now log in.
          </AlertDescription>
        </Alert>
      ) : null}

      {passwordReset ? (
        <Alert>
          <AlertDescription>
            Password updated. You can log in with your new password.
          </AlertDescription>
        </Alert>
      ) : null}

      {mode === "password" ? (
        <form action={pwAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <Field id="login-email" label="Email" required>
            <Input
              id="login-email"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </Field>
          <Field id="login-password" label="Password" required>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                className="pr-10"
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
          {pwState.error ? (
            <Alert variant="destructive">
              <AlertDescription>{pwState.error}</AlertDescription>
            </Alert>
          ) : null}
          <button
            type="submit"
            disabled={pwPending}
            className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
          >
            {pwPending ? "Logging in…" : "Log in"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setMode("magic")}
              className="hover:underline underline-offset-4"
            >
              Send magic link instead
            </button>
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-muted-foreground hover:underline underline-offset-4"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className="block w-full text-center text-sm hover:underline underline-offset-4"
          >
            Log in with an SMS code instead
          </button>
        </form>
      ) : null}

      {mode === "phone" ? (
        <PhoneLogin next={next} onBack={() => setMode("password")} />
      ) : null}

      {mode === "magic" ? (
        <form action={magicAction} className="space-y-5">
          <Field id="magic-email" label="Email" required>
            <Input
              id="magic-email"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </Field>
          {magicState.error ? (
            <Alert variant="destructive">
              <AlertDescription>{magicState.error}</AlertDescription>
            </Alert>
          ) : null}
          {magicState.message ? (
            <Alert>
              <AlertDescription>{magicState.message}</AlertDescription>
            </Alert>
          ) : null}
          <button
            type="submit"
            disabled={magicPending}
            className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
          >
            {magicPending ? "Sending…" : "Send link"}
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className="block text-sm hover:underline underline-offset-4"
          >
            Back to password login
          </button>
        </form>
      ) : null}

      {mode === "reset" ? (
        <form action={resetAction} className="space-y-5">
          <Field id="reset-email" label="Email" required>
            <Input
              id="reset-email"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </Field>
          {resetState.error ? (
            <Alert variant="destructive">
              <AlertDescription>{resetState.error}</AlertDescription>
            </Alert>
          ) : null}
          {resetState.message ? (
            <Alert>
              <AlertDescription>{resetState.message}</AlertDescription>
            </Alert>
          ) : null}
          <button
            type="submit"
            disabled={resetPending}
            className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
          >
            {resetPending ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className="block text-sm hover:underline underline-offset-4"
          >
            Back to password login
          </button>
        </form>
      ) : null}

      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground hover:underline underline-offset-4"
        >
          Register
        </Link>
      </p>
    </div>
  );
}

function PhoneLogin({
  next,
  onBack,
}: {
  next: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await sendPhoneOtp(phone.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? null);
      setStep("code");
    });
  }

  function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyPhoneOtp(phone.trim(), code.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      // Session cookies are set by the server action — go to the destination.
      router.push(next);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={step === "phone" ? requestCode : confirmCode}
      className="space-y-5"
    >
      <Field id="phone-number" label="Mobile number" required>
        <Input
          id="phone-number"
          type="tel"
          name="phone"
          required
          placeholder="+9715XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step === "code"}
          autoComplete="tel"
        />
      </Field>

      {step === "code" ? (
        <Field id="phone-code" label="SMS code" required>
          <Input
            id="phone-code"
            type="text"
            inputMode="numeric"
            name="token"
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
          />
        </Field>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message && step === "code" ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
      >
        {pending
          ? step === "phone"
            ? "Sending…"
            : "Verifying…"
          : step === "phone"
            ? "Send code"
            : "Verify & log in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="hover:underline underline-offset-4"
        >
          Back to password login
        </button>
        {step === "code" ? (
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
              setMessage(null);
            }}
            className="text-muted-foreground hover:underline underline-offset-4"
          >
            Change number
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
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
    </div>
  );
}
