"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  INITIAL_CONTACT_STATE,
  submitContactMessage,
} from "@/app/contact/actions";

export function ContactForm() {
  const [state, formAction] = useActionState(
    submitContactMessage,
    INITIAL_CONTACT_STATE,
  );

  if (state.status === "ok") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-brand bg-brand-soft px-6 py-8 text-center"
      >
        <p className="font-display text-lg text-brand-deep">
          Message received.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The kitchen replies within one business day.
        </p>
      </div>
    );
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6 max-w-xl" noValidate>
      {state.status === "error" && state.error ? (
        <div
          role="alert"
          className="border border-flag-red bg-flag-red/10 px-4 py-3 text-sm text-flag-red"
        >
          {state.error}
        </div>
      ) : null}
      <Field
        id="contact-name"
        label="Name"
        required
        error={fieldErrors.name}
      >
        <Input
          id="contact-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          aria-invalid={fieldErrors.name ? true : undefined}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-6">
        <Field
          id="contact-phone"
          label="Phone"
          required
          error={fieldErrors.phone}
        >
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            placeholder="+971 ..."
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={fieldErrors.phone ? true : undefined}
          />
        </Field>
        <Field
          id="contact-email"
          label="Email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={fieldErrors.email ? true : undefined}
          />
        </Field>
      </div>
      <Field
        id="contact-message"
        label="Message"
        required
        error={fieldErrors.message}
      >
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={500}
          className="resize-none"
          aria-invalid={fieldErrors.message ? true : undefined}
        />
      </Field>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto inline-flex items-center justify-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="font-display text-xs tracking-[0.2em] uppercase text-foreground"
      >
        {label}
        {required ? (
          <span aria-hidden className="text-flag-red">
            {" *"}
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-flag-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
