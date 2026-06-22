"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordReset, type AuthResult } from "@/app/login/actions";

const initial: AuthResult = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(sendPasswordReset, initial);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>We&apos;ll email you a link to log back in and change your password.</p>
        <p>Open the link once. It will take you straight to the change password page.</p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">Email</Label>
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground text-center">
        <Link href="/login" className="text-foreground hover:underline underline-offset-4">
          Back to login
        </Link>
      </p>
    </div>
  );
}
