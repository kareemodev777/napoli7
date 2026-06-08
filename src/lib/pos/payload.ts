// Pure mappers: persisted order row + items -> WooCommerce-shaped POS bodies.
//
// No I/O here so the mapping is unit-testable without a DB or network. These are
// the parts most likely to need a one-line tweak once the POS provider confirms
// its exact schema and allowed status values (see spec §12) — kept isolated here
// precisely so that tweak is trivial and covered by tests.

export type SiteOrderStatus =
  | "received"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface PosCustomization {
  ingredient: string;
  choice: "default" | "extra" | "without";
  extraPrice: number;
}

export interface PosOrderItemRow {
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total_aed: number | string;
  customizations: PosCustomization[] | null;
}

export interface PosDeliveryAddress {
  street?: string;
  area?: string;
  flat?: string;
  notes?: string;
}

export interface PosOrderRow {
  id: string;
  order_number: string;
  status: SiteOrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_type: "delivery" | "pickup";
  delivery_address: PosDeliveryAddress | null;
  delivery_slot: string;
  order_notes: string | null;
  payment_method: "cod" | "card";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  stripe_payment_intent: string | null;
  subtotal_aed: number | string;
  delivery_fee_aed: number | string;
  discount_aed: number | string;
  promo_code: string | null;
  total_aed: number | string;
  created_at: string;
  order_items: PosOrderItemRow[];
}

export interface WooMetaData {
  key: string;
  value: string;
}

export interface WooLineItem {
  name: string;
  quantity: number;
  price: string;
  subtotal: string;
  total: string;
  meta_data: WooMetaData[];
}

export interface WooAddress {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  country: string;
}

export interface WooShippingLine {
  method_id: string;
  method_title: string;
  total: string;
}

export interface WooCouponLine {
  code: string;
  discount: string;
}

export interface WooOrderBody {
  id: string;
  number: string;
  status: string;
  currency: "AED";
  date_created: string;
  total: string;
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  transaction_id?: string;
  customer_note: string;
  billing: WooAddress;
  shipping?: WooAddress;
  line_items: WooLineItem[];
  shipping_lines: WooShippingLine[];
  coupon_lines: WooCouponLine[];
  meta_data: WooMetaData[];
}

export interface WooOrderUpdateBody {
  id: string;
  number: string;
  status: string;
  meta_data: WooMetaData[];
}

/** WooCommerce monetary fields are strings with 2 decimals. */
function money(value: number | string): string {
  return Number(value).toFixed(2);
}

/** first token -> first_name, the remainder (if any) -> last_name. */
export function splitName(full: string): {
  first_name: string;
  last_name: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  const [first, ...rest] = parts;
  return { first_name: first, last_name: rest.join(" ") };
}

/**
 * Site order status -> WooCommerce status. Final values must be confirmed with
 * the POS (§12); the mapping is isolated here so a change is one line + a test.
 */
export function siteStatusToWoo(status: SiteOrderStatus): string {
  switch (status) {
    case "received":
      return "processing";
    case "preparing":
      return "processing";
    case "out_for_delivery":
      return "on-hold";
    case "delivered":
      return "completed";
    case "cancelled":
      return "cancelled";
  }
}

/** customizations[] -> Woo line meta_data entries. */
function customizationMeta(
  customizations: PosCustomization[] | null,
): WooMetaData[] {
  return (customizations ?? [])
    .filter((c) => c.choice !== "default")
    .map((c) => {
      if (c.choice === "without") {
        return { key: c.ingredient, value: "without" };
      }
      // "extra" — carry the upcharge so the kitchen/POS sees the price delta.
      return {
        key: c.ingredient,
        value:
          c.extraPrice > 0
            ? `extra (+${money(c.extraPrice)})`
            : "extra",
      };
    });
}

function lineItem(row: PosOrderItemRow): WooLineItem {
  const lineTotal = Number(row.line_total_aed);
  const qty = row.quantity > 0 ? row.quantity : 1;
  const meta: WooMetaData[] = [];
  if (row.product_id) {
    meta.push({ key: "product_id", value: row.product_id });
  }
  meta.push(...customizationMeta(row.customizations));
  return {
    name: row.product_name,
    quantity: row.quantity,
    price: money(lineTotal / qty),
    subtotal: money(lineTotal),
    total: money(lineTotal),
    meta_data: meta,
  };
}

/**
 * Map a persisted order row + its items into the WooCommerce order-create body.
 * Pure: no DB, no network. Currency is AED throughout; monetary fields are
 * 2-decimal strings.
 */
export function orderRowToWooOrder(order: PosOrderRow): WooOrderBody {
  const name = splitName(order.customer_name);
  const isDelivery = order.delivery_type === "delivery";
  const isCard = order.payment_method === "card";
  const addr = order.delivery_address ?? {};

  const billing: WooAddress = {
    first_name: name.first_name,
    last_name: name.last_name,
    email: order.customer_email,
    phone: order.customer_phone,
    address_1: isDelivery ? addr.street ?? "" : "",
    address_2: isDelivery ? addr.flat ?? "" : "",
    city: isDelivery ? addr.area ?? "" : "",
    state: "Ajman",
    country: "AE",
  };

  const body: WooOrderBody = {
    id: order.order_number,
    number: order.order_number,
    // COD and paid card both map to "processing" (a confirmed, fulfillable
    // order). Other site statuses follow siteStatusToWoo for the update path.
    status: siteStatusToWoo(order.status),
    currency: "AED",
    date_created: order.created_at,
    total: money(order.total_aed),
    payment_method: isCard ? "stripe" : "cod",
    payment_method_title: isCard
      ? "Credit Card (Stripe)"
      : "Cash on Delivery",
    set_paid: order.payment_status === "paid",
    customer_note: order.order_notes ?? "",
    billing,
    line_items: (order.order_items ?? []).map(lineItem),
    shipping_lines: [],
    coupon_lines: [],
    meta_data: [
      { key: "order_number", value: order.order_number },
      { key: "order_id", value: order.id },
      { key: "delivery_type", value: order.delivery_type },
      { key: "delivery_slot", value: order.delivery_slot },
    ],
  };

  // transaction_id: card only.
  if (isCard && order.stripe_payment_intent) {
    body.transaction_id = order.stripe_payment_intent;
  }

  // shipping mirrors billing for delivery; omitted entirely for pickup.
  if (isDelivery) {
    body.shipping = {
      first_name: name.first_name,
      last_name: name.last_name,
      address_1: addr.street ?? "",
      address_2: addr.flat ?? "",
      city: addr.area ?? "",
      state: "Ajman",
      country: "AE",
    };
  }

  // One flat_rate shipping line when a delivery fee was charged.
  const deliveryFee = Number(order.delivery_fee_aed);
  if (deliveryFee > 0) {
    body.shipping_lines.push({
      method_id: "flat_rate",
      method_title: "Delivery",
      total: money(deliveryFee),
    });
  }

  // Discount: prefer a coupon_line carrying the code when one was applied.
  const discount = Number(order.discount_aed);
  if (discount > 0 && order.promo_code) {
    body.coupon_lines.push({
      code: order.promo_code,
      discount: money(discount),
    });
  }

  return body;
}

/**
 * Map (order, new status) -> the minimal WooCommerce order-update body for the
 * product-webhook endpoint. Keyed on the external order id.
 */
export function statusToWooUpdate(
  orderNumber: string,
  status: SiteOrderStatus,
): WooOrderUpdateBody {
  return {
    id: orderNumber,
    number: orderNumber,
    status: siteStatusToWoo(status),
    meta_data: [{ key: "order_status", value: status }],
  };
}
