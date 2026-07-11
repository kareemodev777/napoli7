// Pure mappers: persisted order row + items -> WooCommerce-shaped POS bodies.
//
// No I/O here so the mapping is unit-testable without a DB or network. These are
// the parts most likely to need a one-line tweak once the POS provider confirms
// its exact schema and allowed status values (see spec §12) — kept isolated here
// precisely so that tweak is trivial and covered by tests.

import { resolvePosSku } from "./sku-map";
export { resolvePosSku } from "./sku-map";

export type SiteOrderStatus =
  | "received"
  | "preparing"
  | "ready"
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
  base_price_aed: number | string;
  quantity: number;
  line_total_aed: number | string;
  customizations: PosCustomization[] | null;
  size_label?: string | null;
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
  pizza_cut: boolean | null;
  payment_method: "cod" | "card";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  stripe_payment_intent: string | null;
  subtotal_aed: number | string;
  delivery_fee_aed: number | string;
  service_fee_aed: number | string;
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
  sku: string;
  meta_data: WooMetaData[];
}

export interface WooAddress {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface WooShippingLine {
  method_id: string;
  method_title: string;
  total: string;
}

/** A charge that is not a catalogue product. The POS rejects an unmatched line
 *  item, but accepts a fee line, so this is where non-product fees belong. */
export interface WooFeeLine {
  name: string;
  total: string;
  tax_status: "none" | "taxable";
  total_tax: string;
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
  date_modified: string;
  total: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  transaction_id?: string;
  customer_note: string;
  billing: WooAddress;
  shipping: WooAddress;
  line_items: WooLineItem[];
  tax_lines: unknown[];
  shipping_lines: WooShippingLine[];
  fee_lines: WooFeeLine[];
  coupon_lines: WooCouponLine[];
  refunds: unknown[];
  cart_hash: string;
  meta_data: WooMetaData[];
  parent_id: number;
  order_key: string;
  created_via: string;
  version: string;
  date_paid: string | null;
  date_completed: string | null;
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
    case "ready":
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
  // SKU is keyed on the clean product name + size; the size is also appended to
  // the display name, so it prints on the receipt without breaking lookup.
  const sku = resolvePosSku(row.product_name, row.size_label) ?? "";
  const displayName = row.size_label
    ? `${row.product_name} (${row.size_label})`
    : row.product_name;
  return {
    name: displayName,
    quantity: row.quantity,
    price: money(lineTotal / qty),
    subtotal: money(lineTotal),
    total: money(lineTotal),
    sku,
    meta_data: meta,
  };
}

// The POS resolves EVERY line item to a product in its own catalogue — by SKU,
// or by name when the SKU is blank. It does not accept custom lines: an unmatched
// one is rejected outright with HTTP 500 and the order never syncs.
//
// We used to send the delivery fee as a blank-SKU line named "Delivery", on the
// assumption that the POS tolerated non-catalogue lines. It does not, and there is
// no product called "Delivery" — the POS calls it "Delivery charge". So EVERY
// delivery order failed to reach the kitchen, whether the customer was a guest or
// signed in. Match the POS's own product exactly.
const POS_DELIVERY_PRODUCT_NAME = "Delivery charge";
const POS_DELIVERY_SKU = "DEL-0216";

/**
 * Delivery fee as a line item. The POS receipt only renders the line-items table
 * (not Woo shipping_lines), so sending the fee as shipping made the total look
 * wrong on the print-out. As a line item it prints, and we zero shipping_total so
 * the total can't be double-counted.
 */
function deliveryLineItem(fee: number): WooLineItem {
  return {
    name: POS_DELIVERY_PRODUCT_NAME,
    quantity: 1,
    price: money(fee),
    subtotal: money(fee),
    total: money(fee),
    sku: POS_DELIVERY_SKU,
    meta_data: [{ key: "line_type", value: "delivery_fee" }],
  };
}

/**
 * The service fee, as a Woo fee_line rather than a line item.
 *
 * There is no "Service fee" product in the POS catalogue, so it cannot be a line
 * item — that is the very thing the POS rejects. `fee_lines` is WooCommerce's
 * channel for a charge that is not a product, it needs no catalogue entry, and
 * the POS accepts it (verified against the live endpoint).
 */
function serviceFeeLine(fee: number): WooFeeLine {
  return {
    name: "Service fee",
    total: money(fee),
    tax_status: "none",
    total_tax: "0.00",
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
  const deliveryFee = Number(order.delivery_fee_aed);
  const serviceFee = Number(order.service_fee_aed ?? 0);

  // Delivery moves OUT of shipping_total (set to 0 below) so the receipt itemises
  // it without double-counting. The two fees are independent: free delivery zeroes
  // the delivery fee and leaves the service fee standing, and pickup zeroes both.
  //
  // They travel by different routes because the POS only accepts line items that
  // resolve to one of its products: delivery maps to the POS's own "Delivery
  // charge" product, while the service fee has no product and so must be a fee
  // line. Sending either as a bare custom line item fails the whole push.
  const lineItems = (order.order_items ?? []).map(lineItem);
  if (deliveryFee > 0) {
    lineItems.push(deliveryLineItem(deliveryFee));
  }
  const feeLines: WooFeeLine[] = [];
  if (serviceFee > 0) {
    feeLines.push(serviceFeeLine(serviceFee));
  }

  const billing: WooAddress = {
    first_name: name.first_name,
    last_name: name.last_name,
    email: order.customer_email,
    phone: order.customer_phone,
    company: "",
    address_1: isDelivery ? addr.street ?? "" : "",
    address_2: isDelivery ? addr.flat ?? "" : "",
    city: isDelivery ? addr.area ?? "" : "",
    state: "Ajman",
    postcode: "",
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
    date_modified: order.created_at,
    total: money(order.total_aed),
    discount_total: money(order.discount_aed),
    discount_tax: "0.00",
    // Delivery is carried as a line item (see lineItems above), not shipping, so
    // it prints on the POS receipt. Keep this 0 to avoid double-counting.
    shipping_total: "0.00",
    shipping_tax: "0.00",
    cart_tax: "0.00",
    total_tax: "0.00",
    prices_include_tax: false,
    customer_id: 0,
    customer_ip_address: "",
    customer_user_agent: "Napoli7 website",
    payment_method: isCard ? "stripe" : "cod",
    payment_method_title: isCard
      ? "Credit Card (Stripe)"
      : "Cash on Delivery",
    set_paid: order.payment_status === "paid",
    customer_note: order.order_notes
      ? `${order.order_notes}${order.pizza_cut ? "\nPizza cut: yes" : ""}`
      : order.pizza_cut
        ? "Pizza cut: yes"
        : "",
    billing,
    shipping: isDelivery
      ? {
          first_name: name.first_name,
          last_name: name.last_name,
          company: "",
          address_1: addr.street ?? "",
          address_2: addr.flat ?? "",
          city: addr.area ?? "",
          state: "Ajman",
          postcode: "",
          country: "AE",
        }
      : {
          first_name: name.first_name,
          last_name: name.last_name,
          company: "",
          address_1: "",
          address_2: "",
          city: "",
          state: "Ajman",
          postcode: "",
          country: "AE",
        },
    line_items: lineItems,
    tax_lines: [],
    shipping_lines: [],
    fee_lines: feeLines,
    coupon_lines: [],
    refunds: [],
    cart_hash: "",
    meta_data: [
      { key: "order_number", value: order.order_number },
      { key: "order_id", value: order.id },
      { key: "delivery_type", value: order.delivery_type },
      { key: "delivery_slot", value: order.delivery_slot },
      { key: "pizza_cut", value: order.pizza_cut ? "yes" : "no" },
    ],
    parent_id: 0,
    order_key: order.order_number,
    created_via: "napoli7_website",
    version: "9.0.0",
    date_paid: order.payment_status === "paid" ? order.created_at : null,
    date_completed: null,
  };

  // transaction_id: card only.
  if (isCard && order.stripe_payment_intent) {
    body.transaction_id = order.stripe_payment_intent;
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
