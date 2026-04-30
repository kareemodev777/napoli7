"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Phase 1: client-only acknowledgement. Phase 3 wires this to a Server Action that calls Resend.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSubmitting(false);
    setSubmitted(true);
    (e.target as HTMLFormElement).reset();
  }

  if (submitted) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <Field id="contact-name" label="Name" required>
        <Input
          id="contact-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-6">
        <Field id="contact-phone" label="Phone" required>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            placeholder="+971 ..."
          />
        </Field>
        <Field id="contact-email" label="Email" required>
          <Input id="contact-email" name="email" type="email" required />
        </Field>
      </div>
      <Field id="contact-message" label="Message" required>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={500}
          className="resize-none"
        />
      </Field>
      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
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
    </div>
  );
}
