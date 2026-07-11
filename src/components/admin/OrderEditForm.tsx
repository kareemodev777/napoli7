"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  computeOrderTotals,
  paymentDifference,
  unitPriceFromLine,
} from "@/lib/admin/order-edit";
import { editOrder } from "@/app/admin/orders/[id]/actions";

export interface EditOrderItem {
  id: string;
  productName: string;
  quantity: number;
  lineTotalAed: number;
}

export interface EditOrderProduct {
  id: string;
  name: string;
  priceAed: number;
}

export interface OrderEditFormProps {
  orderId: string;
  orderNumber: string;
  paymentMethod: "cod" | "card";
  paymentStatus: string;
  oldTotalAed: number;
  deliveryFeeAed: number;
  /** Read-only here: shown in the totals, never re-derived from an edit. */
  serviceFeeAed: number;
  discountAed: number;
  orderNotes: string;
  items: EditOrderItem[];
  products: EditOrderProduct[];
}

const HANDLING_OPTIONS = [
  { value: "none", label: "No settlement needed" },
  { value: "cash_collected", label: "Cash collected from customer" },
  { value: "cash_refunded", label: "Cash refunded to customer" },
  { value: "card_manual", label: "Card / manual adjustment" },
] as const;

function money(n: number) {
  return `${n.toFixed(2)} AED`;
}

export function OrderEditForm(props: OrderEditFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(props.items.map((i) => [i.id, i.quantity])),
  );
  const [deliveryFee, setDeliveryFee] = useState(props.deliveryFeeAed);
  const [discount, setDiscount] = useState(props.discountAed);
  const [addProductId, setAddProductId] = useState("");
  const [addQuantity, setAddQuantity] = useState(0);

  const addedProduct = props.products.find((p) => p.id === addProductId);

  const unitPrices = useMemo(
    () =>
      Object.fromEntries(
        props.items.map((i) => [
          i.id,
          unitPriceFromLine(i.lineTotalAed, i.quantity),
        ]),
      ),
    [props.items],
  );

  const totals = useMemo(
    () =>
      computeOrderTotals(
        [
          ...props.items.map((i) => ({
            unitPriceAed: unitPrices[i.id] ?? 0,
            quantity: quantities[i.id] ?? 0,
          })),
          ...(addedProduct && addQuantity > 0
            ? [{ unitPriceAed: addedProduct.priceAed, quantity: addQuantity }]
            : []),
        ],
        Number.isFinite(deliveryFee) ? deliveryFee : 0,
        props.serviceFeeAed,
        Number.isFinite(discount) ? discount : 0,
      ),
    [
      props.items,
      unitPrices,
      quantities,
      addedProduct,
      addQuantity,
      deliveryFee,
      props.serviceFeeAed,
      discount,
    ],
  );

  const diff = paymentDifference(props.oldTotalAed, totals.totalAed);

  function setQty(id: string, value: number) {
    setQuantities((prev) => ({
      ...prev,
      [id]: Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0,
    }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await editOrder(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form id="order-edit-form" onSubmit={onSubmit} className="space-y-8">
      <input type="hidden" name="orderId" value={props.orderId} />

      <section>
        <h2 className="font-display text-xs uppercase tracking-[0.25em] text-foreground mb-4 border-b border-border pb-2">
          Adjust quantities
        </h2>
        <ul className="divide-y divide-border">
          {props.items.map((item) => {
            const qty = quantities[item.id] ?? 0;
            const removed = qty <= 0;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className={removed ? "opacity-50 line-through" : ""}>
                  <p className="text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {money(unitPrices[item.id] ?? 0)} each
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name={`qty_${item.id}`}
                    min={0}
                    max={50}
                    value={qty}
                    onChange={(e) => setQty(item.id, Number(e.target.value))}
                    className="w-20 border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none"
                    aria-label={`Quantity for ${item.productName}`}
                  />
                  <span className="w-24 text-right text-sm tabular-nums">
                    {money((unitPrices[item.id] ?? 0) * qty)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Set a quantity to 0 to remove a line. Increase a quantity to add more
          of an item already in the order.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xs uppercase tracking-[0.25em] text-foreground mb-4 border-b border-border pb-2">
          Add item
        </h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <label className="block text-sm">
            <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Menu item
            </span>
            <select
              name="addProductId"
              value={addProductId}
              onChange={(e) => {
                setAddProductId(e.target.value);
                setAddQuantity(e.target.value ? Math.max(1, addQuantity) : 0);
              }}
              className="mt-2 w-full border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">No additional item</option>
              {props.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {money(product.priceAed)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Qty
            </span>
            <input
              type="number"
              name="addQuantity"
              min={0}
              max={50}
              value={addQuantity}
              onChange={(e) => setAddQuantity(Number(e.target.value))}
              className="mt-2 w-full border border-border bg-background px-3 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none"
            />
          </label>
        </div>
        {addedProduct && addQuantity > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">
            Adds {addQuantity} × {addedProduct.name} ={" "}
            {money(addedProduct.priceAed * addQuantity)}.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Use this when a customer calls to add another menu item to an
            existing order. Customizations can be noted in the audit note.
          </p>
        )}
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Delivery fee (AED)
          </span>
          <input
            type="number"
            name="deliveryFeeAed"
            min={0}
            step="0.01"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(Number(e.target.value))}
            className="mt-2 w-full border border-border bg-background px-3 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Discount (AED)
          </span>
          <input
            type="number"
            name="discountAed"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="mt-2 w-full border border-border bg-background px-3 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none"
          />
        </label>
      </section>

      <section>
        <label className="block text-sm">
          <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Customer order notes
          </span>
          <textarea
            name="orderNotes"
            rows={2}
            defaultValue={props.orderNotes}
            maxLength={500}
            className="mt-2 w-full resize-none border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </label>
      </section>

      <section className="space-y-5 rounded-md bg-muted/30 p-5">
        <h2 className="font-display text-xs uppercase tracking-[0.25em] text-azure-deep">
          Payment difference
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <Row label="New subtotal">{money(totals.subtotalAed)}</Row>
              <Row label="Delivery fee">{money(totals.deliveryFeeAed)}</Row>
              {totals.serviceFeeAed > 0 ? (
                <Row label="Service fee">{money(totals.serviceFeeAed)}</Row>
              ) : null}
              <Row label="Discount">−{money(totals.discountAed)}</Row>
              <div className="border-t border-border pt-2">
                <Row label="Old total">{money(props.oldTotalAed)}</Row>
                <Row label="New total">
                  <strong className="tabular-nums">
                    {money(totals.totalAed)}
                  </strong>
                </Row>
              </div>
            </dl>

            <div
              className={`rounded-md border p-3 text-sm ${
                diff.direction === "collect"
                  ? "border-brand bg-brand/10"
                  : diff.direction === "refund"
                    ? "border-flag-red/50 bg-flag-red/10"
                    : "border-border bg-background"
              }`}
            >
              {diff.direction === "none" ? (
                <span>No payment difference.</span>
              ) : diff.direction === "collect" ? (
                <span>
                  Collect <strong>{money(Math.abs(diff.differenceAed))}</strong>{" "}
                  from the customer.
                </span>
              ) : (
                <span>
                  Refund <strong>{money(Math.abs(diff.differenceAed))}</strong>{" "}
                  to the customer.
                </span>
              )}
              {props.paymentMethod === "card" &&
              props.paymentStatus === "paid" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Card already charged {money(props.oldTotalAed)}. Settle any
                  positive difference in cash or as a manual adjustment.
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                How was the difference settled?
              </span>
              <select
                name="paymentHandling"
                defaultValue="none"
                className="mt-2 w-full border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              >
                {HANDLING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Audit note (optional)
              </span>
              <textarea
                name="paymentNote"
                rows={2}
                maxLength={500}
                placeholder="e.g. Added garlic bread, collected 12 AED cash."
                className="mt-2 w-full resize-none border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Save lives in the sticky top/bottom action bars (form="order-edit-form").
            This just reflects the submit state. */}
        {pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Saving…
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-flag-red" role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="text-sm text-brand" role="status">
            Order updated.
          </p>
        ) : null}
      </section>
    </form>
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
