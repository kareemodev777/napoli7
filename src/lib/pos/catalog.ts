// Read the live POS catalog (product list + SKUs) and reconcile it against our
// hardcoded POS_SKU_ENTRIES map, so the admin can catch a drifted SKU or price
// before it makes an order push mismatch. The compare is pure (testable); the
// fetch is the only I/O.

import { POS_PRODUCTS_URL } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { buildAuthHeaders } from "./client";
import { POS_SKU_ENTRIES, type PosSkuEntry } from "./sku-map";

export interface PosCatalogProduct {
  productName: string;
  sku: string;
  sellingPrice: number;
}

export type FetchCatalogResult =
  | { ok: true; products: PosCatalogProduct[] }
  | { ok: false; error: string };

/** GET the POS product list. Best-effort with a timeout; never throws. */
export async function fetchPosCatalog(
  timeoutMs = 10_000,
): Promise<FetchCatalogResult> {
  if (!POS_PRODUCTS_URL) {
    return { ok: false, error: "POS products URL is not configured." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(POS_PRODUCTS_URL, {
      headers: { ...buildAuthHeaders() },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, error: `POS returned HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      products?: Array<{
        product_name?: string;
        sku?: string;
        selling_price?: string | number;
      }>;
    };
    const products: PosCatalogProduct[] = (data.products ?? [])
      .filter((p) => p.sku)
      .map((p) => ({
        productName: p.product_name ?? "",
        sku: String(p.sku),
        sellingPrice: Number(p.selling_price ?? 0),
      }));
    return { ok: true, products };
  } catch (e) {
    clearTimeout(timer);
    // Node's fetch reports connection-level failures as a bare "fetch failed";
    // the real reason (ENOTFOUND, ECONNREFUSED, timeout, TLS…) is on `cause`.
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    const detail = cause?.code ?? cause?.message;
    const base = e instanceof Error ? e.message : "Could not reach the POS.";
    console.error("[pos] catalog fetch failed:", POS_PRODUCTS_URL, e);
    return { ok: false, error: detail ? `${base} — ${detail}` : base };
  }
}

export type CatalogIssueKind = "missing_sku" | "price_drift";

/** What the website currently charges for one product+size. Read live from the
 *  DB — never a snapshot, or it goes stale the first time a price is edited. */
export interface SitePrice {
  name: string;
  size: PosSkuEntry["size"];
  priceAed: number;
}

export interface CatalogIssue {
  name: string;
  sku: string;
  /** What the website charges — the price we want the POS to agree with. */
  expectedPosPrice: number;
  /** The price the POS currently reports (absent when the SKU is gone). */
  livePosPrice?: number;
  kind: CatalogIssueKind;
}

export interface CatalogReport {
  total: number;
  matched: number;
  issues: CatalogIssue[];
}

const normalizeName = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Reconcile the SKU map against the live POS catalog. Flags a SKU the POS no
 * longer has (`missing_sku`), or a POS price that disagrees with what the WEBSITE
 * currently charges (`price_drift`). Pure — no I/O — so it's unit-tested.
 *
 * Drift is measured live-site vs live-POS. It used to be measured against a price
 * hardcoded in the SKU map, which meant the report went stale the moment anyone
 * edited a price: change the website and the POS together, correctly, and the map
 * still held the old number and reported a "drift" between two systems that in
 * fact agreed. Comparing the two live sources means the report needs no
 * maintenance and only fires when the site and the POS genuinely disagree.
 */
export function comparePosCatalog(
  entries: readonly PosSkuEntry[],
  posProducts: PosCatalogProduct[],
  sitePrices: SitePrice[],
): CatalogReport {
  const bySku = new Map(posProducts.map((p) => [p.sku, p]));
  const siteByNameSize = new Map(
    sitePrices.map((p) => [`${normalizeName(p.name)}|${p.size}`, p.priceAed]),
  );
  const issues: CatalogIssue[] = [];
  let matched = 0;

  for (const entry of entries) {
    const live = bySku.get(entry.sku);
    // The price the website charges today. Falls back to the map's snapshot only
    // for an entry the site no longer sells, where there is nothing live to read.
    const sitePrice =
      siteByNameSize.get(`${normalizeName(entry.name)}|${entry.size}`) ??
      entry.posPrice;

    if (!live) {
      issues.push({
        name: entry.posName,
        sku: entry.sku,
        expectedPosPrice: sitePrice,
        kind: "missing_sku",
      });
      continue;
    }
    if (Math.abs(live.sellingPrice - sitePrice) > 0.001) {
      issues.push({
        name: entry.posName,
        sku: entry.sku,
        expectedPosPrice: sitePrice,
        livePosPrice: live.sellingPrice,
        kind: "price_drift",
      });
      continue;
    }
    matched++;
  }

  return { total: entries.length, matched, issues };
}

/**
 * What the website charges right now, per product+size. A single-size product has
 * no size row, so it is reported as "regular" — the size the SKU map files it under.
 */
export async function fetchSitePrices(): Promise<SitePrice[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("name, price_aed, product_sizes(size_id, price_aed)");

  if (error || !data) {
    console.error("[pos] site price load failed", error);
    return [];
  }

  const prices: SitePrice[] = [];
  for (const product of data as SiteProductRow[]) {
    const sizes = product.product_sizes ?? [];
    if (sizes.length === 0) {
      prices.push({
        name: product.name,
        size: "regular",
        priceAed: Number(product.price_aed),
      });
      continue;
    }
    for (const size of sizes) {
      if (size.size_id !== "small" && size.size_id !== "regular") continue;
      prices.push({
        name: product.name,
        size: size.size_id,
        priceAed: Number(size.price_aed),
      });
    }
  }
  return prices;
}

interface SiteProductRow {
  name: string;
  price_aed: number | string;
  product_sizes?: Array<{ size_id: string; price_aed: number | string }> | null;
}

/** Fetch + reconcile in one call for the admin page. */
export async function verifyPosCatalog(): Promise<
  | { ok: true; report: CatalogReport; posCount: number }
  | { ok: false; error: string }
> {
  const [fetched, sitePrices] = await Promise.all([
    fetchPosCatalog(),
    fetchSitePrices(),
  ]);
  if (!fetched.ok) return fetched;
  return {
    ok: true,
    report: comparePosCatalog(POS_SKU_ENTRIES, fetched.products, sitePrices),
    posCount: fetched.products.length,
  };
}
