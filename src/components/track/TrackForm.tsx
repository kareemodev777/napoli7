"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trackOrder, type TrackOrderResult } from "@/app/track/actions";
import { TrackStatus } from "./TrackStatus";

const initial: TrackOrderResult = {};

export function TrackForm() {
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState(trackOrder, initial);

  const orderIdDefault = params.get("orderId") ?? "";
  const phoneDefault = params.get("phone") ?? "";

  return (
    <div className="space-y-10">
      <form
        action={formAction}
        className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end"
      >
        <Field id="track-orderId" label="Order ID">
          <Input
            id="track-orderId"
            name="orderId"
            required
            defaultValue={orderIdDefault}
            placeholder="N7-00042"
          />
        </Field>
        <Field id="track-phone" label="Phone">
          <Input
            id="track-phone"
            name="phone"
            type="tel"
            required
            defaultValue={phoneDefault}
            placeholder="+971 ..."
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center bg-brand text-primary-foreground py-3 px-8 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? "Looking…" : "Track"}
        </button>
      </form>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.order ? (
        <TrackStatus key={state.order.id} order={state.order} />
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="font-display text-xs tracking-[0.2em] uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
