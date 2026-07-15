"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { type DeliveryZone } from "@/lib/checkout";
import {
  chooseCheckoutArea,
  type CheckoutInitialDetails,
} from "@/lib/checkout-prefill";
import { isRewardPickupOnly } from "@/lib/reward-promo";
import {
  buildDeliveryMapQuery,
  checkDeliverability,
  deliverabilityMessage,
  DELIVERY_RADIUS_KM,
} from "@/lib/delivery-map";
import type {
  PickedLocation,
  GeocodedAddress,
} from "@/components/checkout/DeliveryMapPicker";

// Leaflet touches `window`, so load the picker client-side only.
const DeliveryMapPicker = dynamic(
  () => import("@/components/checkout/DeliveryMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[280px] md:h-[360px] w-full place-items-center border border-border bg-background text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { placeOrder, type PlaceOrderInput } from "@/app/checkout/actions";
import { formatAed } from "@/components/catalog/PriceBadge";
import { PromoField } from "@/components/cart/PromoField";
import {
  amountToFreeDeliveryAed,
  computeOrderFeesAed,
  getDeliveryOrderTotalAed,
  meetsDeliveryMinimumAed,
  qualifiesForFreeDelivery,
  SERVICE_FEE_AED,
} from "@/lib/delivery-settings";

const TIME_SLOTS = generateTimeSlots();

function generateTimeSlots(): string[] {
  return ["ASAP", "+30 min", "+60 min", "+90 min", "+120 min"];
}

export interface CheckoutSavedAddress {
  id: string;
  label: string;
  street: string;
  area: string;
  flat?: string;
  notes?: string;
  isDefault: boolean;
}

const NEW_ADDRESS = "__new__";

/**
 * Match a reverse-geocoded neighbourhood name to one of our delivery zones so a
 * dropped pin can auto-select the area. Prefers an exact match, then falls back
 * to containment (e.g. geocoded "Al Jurf" → zone "Al Jurf 1"). Returns null when
 * nothing matches, so we never overwrite the area with a wrong guess.
 */
function matchZoneArea(zones: DeliveryZone[], geocoded: string): string | null {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const g = norm(geocoded);
  if (!g) return null;

  const exact = zones.find((z) => norm(z.area) === g);
  if (exact) return exact.area;

  const partial = zones.find((z) => {
    const za = norm(z.area);
    return za.includes(g) || g.includes(za);
  });
  return partial ? partial.area : null;
}

// Real menu products use UUID ids. A cart item with a non-UUID id (e.g. a demo
// slug like "margherita-classic") is stale and cannot be ordered — checkout
// detects this up front so the customer gets a clear, recoverable message.
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Show the "Test mode" card hint only when Stripe is running on test keys. The
// publishable key is a NEXT_PUBLIC var, so Next inlines it into the client
// bundle at build time — a live (pk_live) production build hides the hint
// automatically, with no separate flag to remember to flip.
const STRIPE_TEST_MODE = (
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
).startsWith("pk_test");

export function CheckoutForm({
  zones,
  defaultFee,
  deliveryMinSubtotalAed,
  initialDetails = {},
  savedAddresses = [],
  preferredArea,
  rewardCode = null,
}: {
  zones: DeliveryZone[];
  defaultFee: number;
  deliveryMinSubtotalAed: number;
  initialDetails?: CheckoutInitialDetails;
  savedAddresses?: CheckoutSavedAddress[];
  preferredArea?: string;
  /** Auto-applied signup reward code for a signed-in customer who has one. */
  rewardCode?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const promos = useCart((s) => s.promos);
  const discount = useCart((s) => s.discount());
  const clearCart = useCart((s) => s.clear);

  const hydrated = useMounted();
  // A stale cart holds items saved against an older (or demo) menu whose ids
  // aren't UUIDs. These can't be ordered, so we block submission and offer a
  // one-click recovery instead of failing deep in the server action.
  const hasStaleItems =
    hydrated && items.some((it) => !UUID_RE.test(it.productId));
  const [pending, startTransition] = useTransition();
  // Card checkout redirects to Stripe via /api/checkout/create-session, which
  // calls the Stripe API before issuing a 303. That round-trip can take a couple
  // of seconds, during which `pending` (from useTransition) has already cleared
  // because the async action returned. This dedicated flag stays true through
  // the full-page navigation so the button + overlay keep showing progress.
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("canceled") === "1"
      ? "Your payment was canceled. Try again."
      : null,
  );
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [area, setArea] = useState(() =>
    chooseCheckoutArea({
      zones,
      preferredArea: preferredArea ?? initialDetails.deliveryAddress?.area,
    }),
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");
  const [pizzaCut, setPizzaCut] = useState(false);
  // Cash on delivery is pickup-only: for delivery the effective method is always
  // card, regardless of the last pickup selection. Derived (not stored) so we
  // never call setState from an effect.
  const effectivePaymentMethod: "card" | "cod" =
    deliveryType === "delivery" ? "card" : paymentMethod;
  // GPS pin the customer drops on the map — sent to the driver and used to block
  // out-of-Ajman deliveries.
  const [coords, setCoords] = useState<PickedLocation | null>(null);

  // Address fields are controlled so picking a saved address can fill them.
  const [street, setStreet] = useState(
    initialDetails.deliveryAddress?.street ?? "",
  );
  const [flat, setFlat] = useState(initialDetails.deliveryAddress?.flat ?? "");
  const [addressNotes, setAddressNotes] = useState(
    initialDetails.deliveryAddress?.notes ?? "",
  );
  const streetInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState(
    () => savedAddresses.find((a) => a.isDefault)?.id ?? NEW_ADDRESS,
  );

  useEffect(() => {
    let lastSeen = "";
    let tries = 0;

    const syncStreetFromDom = () => {
      const streetInput = document.getElementById(
        "street",
      ) as HTMLInputElement | null;
      const domStreet = streetInput?.value.trim() ?? "";
      if (domStreet && domStreet !== lastSeen) {
        lastSeen = domStreet;
        setStreet(domStreet);
      }
      tries += 1;
      if (tries >= 80) {
        window.clearInterval(timer);
      }
    };

    syncStreetFromDom();
    const timer = window.setInterval(syncStreetFromDom, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function applySavedAddress(id: string) {
    setSelectedAddressId(id);
    if (id === NEW_ADDRESS) {
      setStreet("");
      setFlat("");
      setAddressNotes("");
      return;
    }
    const match = savedAddresses.find((a) => a.id === id);
    if (!match) return;
    setStreet(match.street);
    setFlat(match.flat ?? "");
    setAddressNotes(match.notes ?? "");
    setArea(chooseCheckoutArea({ zones, preferredArea: match.area }));
  }

  function handlePinChange(loc: PickedLocation, address?: GeocodedAddress) {
    setCoords(loc);
    if (!address) return;

    // Fill the street from the reverse-geocoded address only when the field is
    // empty, so we never clobber what the customer typed themselves.
    const streetValue = address.street ?? address.full;
    if (streetValue && !street.trim()) {
      setStreet(streetValue);
      setSelectedAddressId(NEW_ADDRESS);
    }

    // Auto-select the delivery area from the pin when it maps to a known zone.
    if (address.area) {
      const matched = matchZoneArea(zones, address.area);
      if (matched) {
        setArea(matched);
        setSelectedAddressId(NEW_ADDRESS);
      }
    }
  }

  const matchedZone = useMemo(
    () => zones.find((z) => z.area === area) ?? null,
    [zones, area],
  );
  // A delivery order to an area outside the active zones is blocked, never
  // charged a fallback fee (UC-45). Pickup is always "supported".
  const areaSupported = deliveryType !== "delivery" || matchedZone !== null;
  const zoneFee = matchedZone ? matchedZone.fee : defaultFee;
  // Derived by the same function the server uses, so the quote the customer sees
  // is the amount they are charged: free delivery drops the 9 AED zone fee, the
  // 3 AED service fee stands, and pickup pays neither.
  const { deliveryFeeAed: deliveryFee, serviceFeeAed: serviceFee } =
    computeOrderFeesAed({
      deliveryType: deliveryType === "delivery" && matchedZone ? "delivery" : "pickup",
      subtotalAed: subtotal,
      zoneFeeAed: zoneFee,
    });
  const freeDeliveryEarned =
    deliveryType === "delivery" && qualifiesForFreeDelivery(subtotal);
  const toFreeDelivery = amountToFreeDeliveryAed(subtotal);
  const orderTotal = getDeliveryOrderTotalAed({
    subtotalAed: subtotal,
    deliveryFeeAed: deliveryFee,
    serviceFeeAed: serviceFee,
    discountAed: discount,
  });
  const deliveryMapQuery = useMemo(
    () =>
      deliveryType === "delivery"
        ? buildDeliveryMapQuery({ street, area, flat })
        : "",
    [area, deliveryType, flat, street],
  );
  const rewardCount = promos.filter((p) => p.isReward).length;
  // Delivery orders require the item subtotal to clear the minimum (the fees are
  // NOT counted toward it); pickup has no minimum. A reward order is exempt — the
  // client was explicit that the 13 AED minimum does not apply to the promotion.
  // The upgrade rule below is what guards a reward delivery instead; requiring the
  // minimum as well would gate the free pizza twice. Mirrors the server.
  const meetsDeliveryMin =
    deliveryType !== "delivery" ||
    rewardCount > 0 ||
    meetsDeliveryMinimumAed({
      subtotalAed: subtotal,
      deliveryFeeAed: deliveryFee,
      discountAed: discount,
      minimumAed: deliveryMinSubtotalAed,
    });
  // Delivery requires a pin that clears both the radius and the Ajman boundary.
  // Advisory only — the server re-runs the same check before the order is taken.
  const deliverability = useMemo(
    () => checkDeliverability(coords?.lat, coords?.lng),
    [coords],
  );
  const pinAccepted = deliveryType !== "delivery" || deliverability.deliverable;
  // Short form of the same rejection, for the submit button face.
  const pinBlockedLabel =
    pinAccepted || deliverability.deliverable
      ? null
      : deliverability.reason === "no-pin"
        ? "Drop your delivery pin on the map"
        : deliverability.reason === "outside-ajman"
          ? "Pin is outside Ajman — we deliver in Ajman only"
          : `Pin is outside our ${DELIVERY_RADIUS_KM} km delivery range`;
  // A reward order unlocks delivery only once it carries food VALUE beyond the
  // free pizzas the codes pay for — a bigger pizza (the free Small swapped for a
  // Large), a second pizza, a focaccia, a dessert. Drinks don't count. One upgrade
  // is enough for the whole order, however many codes are stacked. The server
  // re-runs this against catalogue prices; this is only the live hint.
  const rewardDiscount = promos
    .filter((p) => p.isReward)
    .reduce((sum, p) => sum + p.amount, 0);
  const rewardEligibilityItems = items.map((it) => ({
    categoryId: it.categoryId,
    lineTotalAed: it.unitPrice * it.quantity,
  }));
  const rewardPickupOnly = isRewardPickupOnly(
    rewardEligibilityItems,
    rewardCount,
    rewardDiscount,
  );
  const deliveryAllowed = deliveryType !== "delivery" || !rewardPickupOnly;
  const canSubmit =
    areaSupported && meetsDeliveryMin && pinAccepted && deliveryAllowed;

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
    if (hasStaleItems) {
      setError(
        "Your cart is out of date. Please clear it and re-add your items from the menu.",
      );
      return;
    }
    if (!areaSupported) {
      setError(
        "We don't deliver to that area yet. Choose a supported area or switch to pickup.",
      );
      return;
    }
    if (!meetsDeliveryMin) {
      setError(
        `Delivery orders need at least ${formatAed(deliveryMinSubtotalAed)} in items (the delivery fee doesn't count). Add a little more, or switch to pickup.`,
      );
      return;
    }
    if (deliveryType === "delivery" && rewardPickupOnly) {
      setError(
        "Your free pizza is pickup-only on its own. Upgrade it to a bigger pizza, or add another pizza, a focaccia or a dessert to unlock delivery — a drink doesn't count — or switch to pickup.",
      );
      return;
    }
    if (deliveryType === "delivery" && !deliverability.deliverable) {
      setError(deliverabilityMessage(deliverability));
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);

    const rawAddress =
      deliveryType === "delivery"
        ? {
            street: String(formData.get("street") ?? ""),
            area: String(formData.get("area") ?? ""),
            flat: String(formData.get("flat") ?? "") || undefined,
            notes: String(formData.get("addressNotes") ?? "") || undefined,
            mapQuery: deliveryMapQuery || undefined,
            lat: coords?.lat,
            lng: coords?.lng,
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
      pizzaCut,
      paymentMethod: effectivePaymentMethod,
      promoCodes: promos.map((p) => p.code),
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.name,
        sizeId: it.sizeId,
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
          // Card payment path — redirect to Stripe session creation route. Hold
          // the loading state (button + overlay) until the browser leaves this
          // page, so the slow Stripe round-trip never looks frozen.
          setRedirecting(true);
          window.location.href = result.paymentUrl;
          return;
        }
        if (result.orderId) {
          clearCart();
          // Straight to live order tracking (COD is placed and confirmed).
          router.push(
            `/track?orderId=${result.orderId}&phone=${encodeURIComponent(payload.phone)}&placed=1`,
          );
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
      {/* z-[2000] sits above Leaflet's map panes/controls (which reach ~1000)
          so the delivery map never pokes through the payment-redirect overlay. */}
      {redirecting ? (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-5 bg-background/90 backdrop-blur-sm px-6 text-center"
        >
          <Spinner className="h-8 w-8" />
          <p className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
            Taking you to secure payment…
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Hang on — we’re opening the Stripe checkout. Don’t refresh or go
            back.
          </p>
        </div>
      ) : null}

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
            {/* Optional — order updates go by SMS. An email only adds a receipt. */}
            <Field id="email" label="Email (optional)">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initialDetails.email ?? ""}
                autoComplete="email"
                placeholder="For an emailed receipt"
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
            <div className="space-y-5">
              {savedAddresses.length > 0 ? (
                <Field id="savedAddress" label="Use a saved address">
                  <select
                    id="savedAddress"
                    value={selectedAddressId}
                    onChange={(e) => applySavedAddress(e.target.value)}
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand"
                  >
                    {savedAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.street}
                        {a.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                    <option value={NEW_ADDRESS}>New address</option>
                  </select>
                </Field>
              ) : null}
              <div className="grid sm:grid-cols-2 gap-5">
                <Field
                  id="area"
                  label="Area in Ajman"
                  required
                  hint={
                    areaSupported
                      ? `Delivery fee: ${formatAed(zoneFee)}`
                      : "We don't deliver to that area yet — switch to pickup."
                  }
                >
                  <select
                    id="area"
                    name="area"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    aria-invalid={!areaSupported}
                    className={
                      "w-full border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand " +
                      (areaSupported ? "border-border" : "border-flag-red")
                    }
                  >
                    {zones.length === 0 ? (
                      <option value="">No delivery areas available</option>
                    ) : null}
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
                    value={street}
                    ref={streetInputRef}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      setSelectedAddressId(NEW_ADDRESS);
                    }}
                    autoComplete="street-address"
                  />
                </Field>
                <Field id="flat" label="Flat / apartment">
                  <Input
                    id="flat"
                    name="flat"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                  />
                </Field>
                <Field id="addressNotes" label="Delivery instructions">
                  <Input
                    id="addressNotes"
                    name="addressNotes"
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                  />
                </Field>
              </div>
              <div className="border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep">
                      Drop your delivery pin
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap the map to set your exact spot — the driver gets this
                      GPS point. Drag the pin to fine-tune it.
                    </p>
                  </div>
                </div>
                <DeliveryMapPicker value={coords} onChange={handlePinChange} />
                {deliverability.deliverable ? (
                  <p className="text-xs text-muted-foreground">
                    Pin set · {deliverability.distanceKm.toFixed(1)} km from the
                    shop, inside Ajman — within our {DELIVERY_RADIUS_KM} km
                    range. ✓
                  </p>
                ) : (
                  <p className="text-xs text-flag-red">
                    {deliverabilityMessage(deliverability)}
                  </p>
                )}
              </div>
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
          <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={pizzaCut}
              onChange={(e) => setPizzaCut(e.target.checked)}
              className="mt-1 h-4 w-4 border-border text-brand focus:ring-brand"
            />
            <span>
              Cut the pizza for me
              <span className="block text-xs text-muted-foreground">
                We’ll slice it before it leaves the kitchen.
              </span>
            </span>
          </label>
        </Section>

        <Section title="Payment">
          <div className="max-w-md border border-border bg-brand/10 p-4 space-y-4">
            {deliveryType === "pickup" ? (
              <>
                <p className="font-display text-sm tracking-[0.1em] uppercase">
                  Choose payment method
                </p>
                <div className="grid grid-cols-2 gap-px bg-border border border-border w-fit">
                  <Toggle
                    active={paymentMethod === "card"}
                    onClick={() => setPaymentMethod("card")}
                  >
                    Card
                  </Toggle>
                  <Toggle
                    active={paymentMethod === "cod"}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    Cash on delivery
                  </Toggle>
                </div>
                <p className="text-xs text-muted-foreground">
                  Card, Apple Pay, and Google Pay are still available. Cash on
                  delivery is for pickup orders only.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-sm tracking-[0.1em] uppercase">
                  Card payment
                </p>
                <p className="text-xs text-muted-foreground">
                  We accept cards, Apple Pay, and Google Pay. Delivery orders
                  can’t use cash on delivery.
                </p>
              </>
            )}
            {STRIPE_TEST_MODE ? (
              <p className="text-xs text-muted-foreground">
                Test mode: card{" "}
                <code className="font-mono">4242 4242 4242 4242</code>.
              </p>
            ) : null}
          </div>
        </Section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Order not placed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            {hasStaleItems ? (
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  router.push("/menu");
                }}
                className="mt-3 inline-flex items-center justify-center border border-foreground px-4 py-2 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
              >
                Clear cart &amp; browse menu
              </button>
            ) : null}
          </Alert>
        ) : null}

        <button
          type="submit"
          disabled={pending || redirecting || !canSubmit}
          aria-busy={pending || redirecting}
          className="w-full inline-flex items-center justify-center gap-3 bg-brand text-primary-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover disabled:opacity-50"
        >
          {redirecting ? (
            <>
              <Spinner />
              Redirecting to secure payment…
            </>
          ) : pending ? (
            <>
              <Spinner />
              Preparing secure payment…
            </>
          ) : !areaSupported ? (
            "Delivery unavailable for this area"
          ) : !meetsDeliveryMin ? (
            `Minimum ${formatAed(deliveryMinSubtotalAed)} in items for delivery`
          ) : pinBlockedLabel ? (
            pinBlockedLabel
          ) : paymentMethod === "cod" && deliveryType === "pickup" ? (
            "Place pickup order"
          ) : (
            "Continue to secure payment"
          )}
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
          {promos.length > 0 ? (
            <Row
              label={
                promos.length === 1
                  ? `Discount · ${promos[0].code}`
                  : `Discount · ${promos.length} codes`
              }
            >
              −{formatAed(discount)}
            </Row>
          ) : null}
          <Row label="Delivery fee">
            {deliveryType !== "delivery" ? (
              "Free · pickup"
            ) : freeDeliveryEarned ? (
              <span className="text-basil">Free ✓</span>
            ) : (
              formatAed(deliveryFee)
            )}
          </Row>
          <Row label="Service fee">
            {deliveryType === "delivery"
              ? formatAed(serviceFee)
              : "Free · pickup"}
          </Row>
        </dl>
        {deliveryType === "delivery" && !freeDeliveryEarned && meetsDeliveryMin ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Add {formatAed(toFreeDelivery)} more in items for free delivery — the{" "}
            {formatAed(SERVICE_FEE_AED)} service fee still applies.
          </p>
        ) : null}
        {!meetsDeliveryMin ? (
          <p className="mt-3 text-xs text-flag-red">
            Minimum {formatAed(deliveryMinSubtotalAed)} in items for delivery
            (fees excluded). Add{" "}
            {formatAed(Math.max(0, deliveryMinSubtotalAed - subtotal))} more, or
            switch to pickup.
          </p>
        ) : null}
        {deliveryType === "delivery" && rewardPickupOnly ? (
          <p className="mt-3 text-xs text-flag-red">
            Your free pizza is pickup-only on its own. Upgrade it to a bigger
            pizza, or add another pizza, a focaccia or a dessert to unlock
            delivery — a drink doesn&apos;t count — or switch to pickup.
          </p>
        ) : null}
        <div className="mt-4">
          <p className="font-display text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
            Promo code
          </p>
          <PromoField autoApplyCode={rewardCode} />
        </div>
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

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"
      />
    </svg>
  );
}
