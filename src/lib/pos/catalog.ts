// Read the live POS catalog (product list + SKUs) and reconcile it against our
// hardcoded POS_SKU_ENTRIES map, so the admin can catch a drifted SKU or price
// before it makes an order push mismatch. The compare is pure (testable); the
// fetch is the only I/O.

import { POS_PRODUCTS_URL } from "@/lib/env";
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

export interface CatalogIssue {
  name: string;
  sku: string;
  /** The POS price our map expects. */
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

/**
 * Reconcile our SKU map against the live POS catalog. Flags entries whose SKU no
 * longer exists in the POS (`missing_sku`) or whose POS price has drifted from
 * what our map records (`price_drift`). Pure — no I/O — so it's unit-tested.
 */
export function comparePosCatalog(
  entries: readonly PosSkuEntry[],
  posProducts: PosCatalogProduct[],
): CatalogReport {
  const bySku = new Map(posProducts.map((p) => [p.sku, p]));
  const issues: CatalogIssue[] = [];
  let matched = 0;

  for (const entry of entries) {
    const live = bySku.get(entry.sku);
    if (!live) {
      issues.push({
        name: entry.posName,
        sku: entry.sku,
        expectedPosPrice: entry.posPrice,
        kind: "missing_sku",
      });
      continue;
    }
    if (Math.abs(live.sellingPrice - entry.posPrice) > 0.001) {
      issues.push({
        name: entry.posName,
        sku: entry.sku,
        expectedPosPrice: entry.posPrice,
        livePosPrice: live.sellingPrice,
        kind: "price_drift",
      });
      continue;
    }
    matched++;
  }

  return { total: entries.length, matched, issues };
}

/** Fetch + reconcile in one call for the admin page. */
export async function verifyPosCatalog(): Promise<
  | { ok: true; report: CatalogReport; posCount: number }
  | { ok: false; error: string }
> {
  const fetched = await fetchPosCatalog();
  if (!fetched.ok) return fetched;
  return {
    ok: true,
    report: comparePosCatalog(POS_SKU_ENTRIES, fetched.products),
    posCount: fetched.products.length,
  };
}
