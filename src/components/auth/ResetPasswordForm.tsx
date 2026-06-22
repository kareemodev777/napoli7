"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void (async () => {
      const sessionResult = await getBrowserSupabase().auth.getSession();
      if (active) setReady(Boolean(sessionResult.data.session));
    })().catch(() => {
      if (active) setReady(false);
    });
    return () => { active = false; };
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const nextPassword = password.trim();
    if (nextPassword.length < 8) return setError("Use at least 8 characters.");
    if (nextPassword !== confirmPassword) return setError("Passwords do not match.");

    startTransition(async () => {
      const supabase = getBrowserSupabase();
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;
      if (!session) return setError("Open the reset link from your email first.");

      const { error: updateError } = await supabase.auth.updateUser({
        password: nextPassword,
      });
      if (updateError) return setError(updateError.message);

      setMessage("Password updated. Taking you to your account…");
      router.replace("/account");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Use the link from your email to log in and set a new password.</p>
        <p>If the page opened in the wrong place, open the email again and click it once more.</p>
      </div>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!ready ? (
        <Alert>
          <AlertDescription>
            Waiting for the recovery session. If nothing happens, open the email link again.
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save new password"}
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
