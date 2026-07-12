"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createManualOrder } from "@/app/admin/orders/new/actions";
import {
  computeOrderFeesAed,
  getDeliveryOrderTotalAed,
  STANDARD_DELIVERY_FEE_AED,
} from "@/lib/delivery-settings";

export interface ManualOrderProduct {
  id: string;
  name: string;
  sizes: { sizeId: string; label: string; priceAed: number }[];
}

interface Line {
  key: number;
  productId: string;
  sizeId: string;
  quantity: number;
}

let lineSeq = 0;

export function ManualOrderForm({
  products,
  areas,
}: {
  products: ManualOrderProduct[];
  areas: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+971");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [street, setStreet] = useState("");
  const [area, setArea] = useState(areas[0] ?? "");
  const [flat, setFlat] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [orderNotes, setOrderNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: lineSeq++, productId: "", sizeId: "", quantity: 1 },
  ]);

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  // The same arithmetic the server will redo. Shown so staff can read the total
  // back to the customer on the call — the server's figure is the one that counts.
  const subtotal = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    const size = product?.sizes.find((s) => s.sizeId === line.sizeId);
    return sum + (size ? size.priceAed * line.quantity : 0);
  }, 0);
  const { deliveryFeeAed, serviceFeeAed } = computeOrderFeesAed({
    deliveryType,
    subtotalAed: subtotal,
    zoneFeeAed: STANDARD_DELIVERY_FEE_AED,
  });
  const total = getDeliveryOrderTotalAed({
    subtotalAed: subtotal,
    deliveryFeeAed,
    serviceFeeAed,
  });

  function setLine(key: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const items = lines
      .filter((l) => l.productId && l.sizeId && l.quantity > 0)
      .map((l) => ({
        productId: l.productId,
        sizeId: l.sizeId,
        quantity: l.quantity,
      }));

    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }

    startTransition(async () => {
      const result = await createManualOrder({
        customerName,
        customerPhone,
        deliveryType,
        street,
        area,
        flat,
        addressNotes,
        paymentMethod,
        orderNotes,
        items,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/admin/orders/${result.orderId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Customer">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+9715XXXXXXXX"
              required
            />
          </Field>
        </div>
      </Section>

      <Section title="Fulfilment">
        <div className="flex gap-3">
          {(["delivery", "pickup"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDeliveryType(type)}
              className={
                "h-10 px-4 border font-display text-[11px] tracking-[0.2em] uppercase " +
                (deliveryType === type
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground")
              }
            >
              {type}
            </button>
          ))}
        </div>

        {deliveryType === "delivery" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Street / building">
              <input
                className={inputClass}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
              />
            </Field>
            <Field label="Area">
              <select
                className={inputClass}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Flat / villa (optional)">
              <input
                className={inputClass}
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
              />
            </Field>
            <Field label="Directions for the driver (optional)">
              <input
                className={inputClass}
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Section>

      <Section title="Items">
        <div className="space-y-3">
          {lines.map((line) => {
            const product = byId.get(line.productId);
            return (
              <div key={line.key} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Field label="Item">
                    <select
                      className={inputClass}
                      value={line.productId}
                      onChange={(e) => {
                        const next = byId.get(e.target.value);
                        setLine(line.key, {
                          productId: e.target.value,
                          // Default to the first size so a half-filled line can't
                          // silently price at zero.
                          sizeId: next?.sizes[0]?.sizeId ?? "",
                        });
                      }}
                    >
                      <option value="">Choose…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="w-40">
                  <Field label="Size">
                    <select
                      className={inputClass}
                      value={line.sizeId}
                      onChange={(e) =>
                        setLine(line.key, { sizeId: e.target.value })
                      }
                      disabled={!product}
                    >
                      {(product?.sizes ?? []).map((s) => (
                        <option key={s.sizeId} value={s.sizeId}>
                          {s.label} · {s.priceAed.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="w-24">
                  <Field label="Qty">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className={inputClass}
                      value={line.quantity}
                      onChange={(e) =>
                        setLine(line.key, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLines((c) =>
                      c.length === 1
                        ? c
                        : c.filter((l) => l.key !== line.key),
                    )
                  }
                  className="h-10 w-10 inline-flex items-center justify-center border border-border hover:border-flag-red hover:text-flag-red"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            setLines((c) => [
              ...c,
              { key: lineSeq++, productId: "", sizeId: "", quantity: 1 },
            ])
          }
          className="mt-4 inline-flex items-center gap-2 border border-border h-10 px-4 font-display text-[11px] tracking-[0.2em] uppercase hover:border-foreground"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add item
        </button>
      </Section>

      <Section title="Payment">
        <div className="flex gap-3">
          {(
            [
              { value: "cod", label: "Cash" },
              { value: "card", label: "Card" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPaymentMethod(option.value)}
              className={
                "h-10 px-4 border font-display text-[11px] tracking-[0.2em] uppercase " +
                (paymentMethod === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Collected on delivery or at the counter. The website&apos;s online-card
          flow does not apply to a phone order.
        </p>

        <div className="mt-4">
          <Field label="Order notes (optional)">
            <input
              className={inputClass}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <div className="border border-border bg-card p-5">
        <dl className="space-y-2 text-sm tabular-nums">
          <Row label="Subtotal">{subtotal.toFixed(2)} AED</Row>
          <Row label="Delivery fee">{deliveryFeeAed.toFixed(2)} AED</Row>
          <Row label="Service fee">{serviceFeeAed.toFixed(2)} AED</Row>
          <div className="border-t border-border pt-2 font-display text-base">
            <Row label="Total">{total.toFixed(2)} AED</Row>
          </div>
        </dl>
      </div>

      {error ? <p className="text-sm text-flag-red">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full h-10 border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
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
      <dd>{children}</dd>
    </div>
  );
}
