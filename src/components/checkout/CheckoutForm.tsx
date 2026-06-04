"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DeliveryZone } from "@/lib/checkout";
import {
  chooseCheckoutArea,
  type CheckoutInitialDetails,
} from "@/lib/checkout-prefill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { placeOrder, type PlaceOrderInput } from "@/app/checkout/actions";
import { formatAed } from "@/components/catalog/PriceBadge";

const TIME_SLOTS = generateTimeSlots();

function generateTimeSlots(): string[] {
  return ["ASAP", "+30 min", "+60 min", "+90 min", "+120 min"];
}

export function CheckoutForm({
  zones,
  defaultFee,
  initialDetails = {},
}: {
  zones: DeliveryZone[];
  defaultFee: number;
  initialDetails?: CheckoutInitialDetails;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const promo = useCart((s) => s.promo);
  const discount = useCart((s) => s.discount());
  const total = useCart((s) => s.total());
  const clearCart = useCart((s) => s.clear);

  const hydrated = useMounted();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    searchParams.get("canceled") === "1"
      ? "Your payment was canceled. Try again or choose Cash on Delivery."
      : null,
  );
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [area, setArea] = useState(() =>
    chooseCheckoutArea({
      zones,
      preferredArea: initialDetails.deliveryAddress?.area,
    }),
  );
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");

  const zoneFee = useMemo(() => {
    const match = zones.find((z) => z.area === area);
    return match ? match.fee : defaultFee;
  }, [zones, area, defaultFee]);
  const deliveryFee = deliveryType === "delivery" ? zoneFee : 0;
  const orderTotal = total + deliveryFee;

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading checkout…</p>;
  }

  if (items.length === 0) {
    return (
      <Alert className="max-w-2xl">
        <AlertTitle>Your cart is empty</AlertTitle>
        <AlertDescription>
          Add an item from the menu before checking out.
        </AlertDescription>
      </Alert>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const rawAddress =
      deliveryType === "delivery"
        ? {
            street: String(formData.get("street") ?? ""),
            area: String(formData.get("area") ?? ""),
            flat: String(formData.get("flat") ?? "") || undefined,
            notes: String(formData.get("addressNotes") ?? "") || undefined,
          }
        : undefined;

    const payload: PlaceOrderInput = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "")
        .trim()
        .replace(/\s+/g, ""),
      email: String(formData.get("email") ?? "").trim(),
      deliveryType,
      deliveryAddress: rawAddress,
      deliverySlot: String(formData.get("deliverySlot") ?? "ASAP"),
      orderNotes: String(formData.get("orderNotes") ?? "") || undefined,
      paymentMethod,
      promoCode: promo?.code,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.name,
        basePriceAed: it.basePrice,
        quantity: it.quantity,
        customizations: it.customizations,
        lineTotalAed: it.unitPrice * it.quantity,
      })),
    };

    startTransition(async () => {
      try {
        const result = await placeOrder(payload);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.paymentUrl) {
          // Card payment path — redirect to Stripe session creation route
          window.location.href = result.paymentUrl;
          return;
        }
        if (result.orderId) {
          clearCart();
          router.push(`/order/${result.orderId}/confirmation`);
        }
      } catch (e) {
        console.error(e);
        setError(
          "Something went wrong placing your order. Please try again or call +971 6 534 5772.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start"
    >
      <div className="space-y-10">
        <Section title="Contact details">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="firstName" label="First name" required>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={initialDetails.firstName ?? ""}
                autoComplete="given-name"
              />
            </Field>
            <Field id="lastName" label="Last name" required>
              <Input
                id="lastName"
                name="lastName"
                required
                defaultValue={initialDetails.lastName ?? ""}
                autoComplete="family-name"
              />
            </Field>
            <Field
              id="phone"
              label="Phone"
              required
              hint="UAE mobile starting with +971"
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="+971501234567"
                pattern="^\+971[0-9]{8,9}$"
                defaultValue={initialDetails.phone ?? ""}
                autoComplete="tel"
              />
            </Field>
            <Field id="email" label="Email" required>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={initialDetails.email ?? ""}
                autoComplete="email"
              />
            </Field>
          </div>
        </Section>

        <Section title="Delivery">
          <div className="grid grid-cols-2 gap-px bg-border border border-border w-fit mb-6">
            <Toggle
              active={deliveryType === "delivery"}
              onClick={() => setDeliveryType("delivery")}
            >
              Deliver
            </Toggle>
            <Toggle
              active={deliveryType === "pickup"}
              onClick={() => setDeliveryType("pickup")}
            >
              Pickup
            </Toggle>
          </div>

          {deliveryType === "delivery" ? (
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                id="area"
                label="Area in Ajman"
                required
                hint={`Delivery fee: ${formatAed(zoneFee)}`}
              >
                <select
                  id="area"
                  name="area"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand"
                >
                  {zones.map((z) => (
                    <option key={z.area} value={z.area}>
                      {z.area}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="street" label="Street + building" required>
                <Input
                  id="street"
                  name="street"
                  required
                  placeholder="Sheikh Rashid bin Abdul Aziz St, Building 213"
                  defaultValue={initialDetails.deliveryAddress?.street ?? ""}
                  autoComplete="street-address"
                />
              </Field>
              <Field id="flat" label="Flat / apartment">
                <Input
                  id="flat"
                  name="flat"
                  defaultValue={initialDetails.deliveryAddress?.flat ?? ""}
                />
              </Field>
              <Field id="addressNotes" label="Delivery instructions">
                <Input
                  id="addressNotes"
                  name="addressNotes"
                  defaultValue={initialDetails.deliveryAddress?.notes ?? ""}
                />
              </Field>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pickup orders are ready in around 15 minutes at Shop 4, Al Jurf 2,
              Ajman.
            </p>
          )}

          <div className="mt-6">
            <Field id="deliverySlot" label="Time slot">
              <select
                id="deliverySlot"
                name="deliverySlot"
                defaultValue="ASAP"
                className="w-full border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Order notes">
          <Textarea
            id="orderNotes"
            name="orderNotes"
            rows={3}
            maxLength={500}
            placeholder="Anything the kitchen should know — well-baked, light cheese, etc."
            className="resize-none"
          />
        </Section>

        <Section title="Payment">
          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border max-w-md">
            <PaymentOption
              active={paymentMethod === "cod"}
              onClick={() => setPaymentMethod("cod")}
              title="Cash on delivery"
              note="Pay cash to the driver."
            />
            <PaymentOption
              active={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
              title="Pay by card"
              note="Card · Apple Pay · Google Pay."
            />
          </div>
          {paymentMethod === "card" ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Card payments redirect to a secure hosted page. Test mode: card{" "}
              <code className="font-mono">4242 4242 4242 4242</code>.
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Pay cash to the driver on arrival. Please have exact change if you
              can.
            </p>
          )}
        </Section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Order not placed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? "Placing order…" : "Place order"}
        </button>
      </div>

      <aside className="border border-border bg-card p-6 lg:sticky lg:top-6">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-5">
          Order summary
        </h2>
        <ul className="space-y-3 text-sm border-b border-border pb-4">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className="leading-tight">
                {it.quantity} × {it.name}
              </span>
              <span className="tabular-nums">
                {formatAed(it.unitPrice * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Subtotal">{formatAed(subtotal)}</Row>
          {promo ? (
            <Row label={`Discount · ${promo.code}`}>
              −{formatAed(discount)}
            </Row>
          ) : null}
          <Row label="Delivery fee">
            {deliveryType === "delivery" ? formatAed(deliveryFee) : "Free · pickup"}
          </Row>
        </dl>
        <div className="mt-4 border-t border-border pt-3 flex items-baseline justify-between">
          <span className="font-display text-xs tracking-[0.25em] uppercase">
            Total
          </span>
          <span className="font-display text-xl tabular-nums">
            {formatAed(orderTotal)}
          </span>
        </div>
      </aside>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xs tracking-[0.25em] uppercase text-foreground mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
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
            {" *"}
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "min-h-[44px] px-6 font-display text-xs tracking-[0.2em] uppercase " +
        (active
          ? "bg-brand text-primary-foreground"
          : "bg-background hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

function PaymentOption({
  active,
  onClick,
  title,
  note,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "p-4 text-left " +
        (active
          ? "bg-brand text-primary-foreground"
          : "bg-background hover:bg-muted")
      }
    >
      <p className="font-display text-sm tracking-[0.1em] uppercase">{title}</p>
      <p
        className={
          "text-xs mt-1 " +
          (active ? "text-primary-foreground/85" : "text-muted-foreground")
        }
      >
        {note}
      </p>
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
