"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerCustomer, type RegisterResult } from "@/app/register/actions";

const initial: RegisterResult = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field id="reg-firstName" label="First name" required>
          <Input id="reg-firstName" name="firstName" required />
        </Field>
        <Field id="reg-lastName" label="Last name" required>
          <Input id="reg-lastName" name="lastName" required />
        </Field>
      </div>
      <Field id="reg-email" label="Email" required>
        <Input id="reg-email" type="email" name="email" required autoComplete="email" />
      </Field>
      <Field id="reg-password" label="Password" required hint="At least 8 characters.">
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
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
      <Field id="reg-confirm" label="Confirm password" required>
        <Input
          id="reg-confirm"
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          required
          autoComplete="new-password"
        />
      </Field>

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

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-3.5 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline underline-offset-4">
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
      <Label htmlFor={id} className="font-display text-xs tracking-[0.2em] uppercase">
        {label}
        {required ? <span aria-hidden className="text-flag-red"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
