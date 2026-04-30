"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  loginWithPassword,
  sendMagicLink,
  sendPasswordReset,
  type AuthResult,
} from "@/app/login/actions";

const initial: AuthResult = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const confirmed = params.get("confirmed") === "true";

  const [mode, setMode] = useState<"password" | "magic" | "reset">("password");
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
        </form>
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
