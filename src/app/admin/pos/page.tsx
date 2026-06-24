import type { Metadata } from "next";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyPosCatalog, type CatalogIssue } from "@/lib/pos/catalog";
import { RetryPosButton } from "@/components/admin/RetryPosButton";

export const metadata: Metadata = {
  title: "POS · Admin",
  alternates: { canonical: "/admin/pos" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PushLogRow {
  id: string;
  orderNumber: string;
  kind: string;
  status: string;
  httpStatus: number | null;
  attempts: number;
  error: string | null;
  createdAt: string;
}

async function loadPushLog(): Promise<PushLogRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("pos_push_log")
    .select("id, order_number, kind, status, http_status, attempts, error, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    kind: r.kind,
    status: r.status,
    httpStatus: r.http_status,
    attempts: r.attempts,
    error: r.error,
    createdAt: r.created_at,
  }));
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function countFailedSyncs(): Promise<number> {
  if (!HAS_SUPABASE_SERVICE) return 0;
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("pos_sync_status", "failed");
  return count ?? 0;
}

export default async function AdminPosPage() {
  const [verification, pushLog, failedCount] = await Promise.all([
    verifyPosCatalog(),
    loadPushLog(),
    countFailedSyncs(),
  ]);

  return (
    <section className="px-6 md:px-10 py-12">
      <div className="max-w-[1400px] mx-auto space-y-12">
        <div>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
            POS
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Verify our product/SKU map against the live POS catalog, and review
            the order push log.
          </p>
        </div>

        <Catalog verification={verification} />
        <PushLog rows={pushLog} failedCount={failedCount} />
      </div>
    </section>
  );
}

function Catalog({
  verification,
}: {
  verification: Awaited<ReturnType<typeof verifyPosCatalog>>;
}) {
  return (
    <div>
      <h2 className="font-display text-xl uppercase tracking-[1.5px]">
        Catalog check
      </h2>
      {!verification.ok ? (
        <p className="mt-4 inline-flex items-center bg-flag-red/10 text-flag-red px-3 py-2 text-sm">
          Couldn&rsquo;t reach the POS catalog: {verification.error}
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Stat label="Live POS products" value={verification.posCount} />
            <Stat label="SKUs we map" value={verification.report.total} />
            <Stat
              label="Matched"
              value={verification.report.matched}
              tone="ok"
            />
            <Stat
              label="Issues"
              value={verification.report.issues.length}
              tone={verification.report.issues.length > 0 ? "bad" : "ok"}
            />
          </div>

          {verification.report.issues.length === 0 ? (
            <p className="mt-5 text-sm text-flag-green">
              Every mapped SKU exists in the POS at the expected price. ✓
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-t border-border">
                <thead>
                  <tr className="text-left font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    <th className="py-3 pr-4">Product</th>
                    <th className="py-3 pr-4">SKU</th>
                    <th className="py-3 pr-4">Issue</th>
                    <th className="py-3 pr-4">Expected</th>
                    <th className="py-3 pr-4">Live POS</th>
                  </tr>
                </thead>
                <tbody>
                  {verification.report.issues.map((issue) => (
                    <IssueRow key={`${issue.sku}-${issue.kind}`} issue={issue} />
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-muted-foreground">
                Fix these in{" "}
                <code className="font-mono">src/lib/pos/sku-map.ts</code> so
                order pushes carry the right SKU and price.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: CatalogIssue }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="py-3 pr-4">{issue.name}</td>
      <td className="py-3 pr-4 font-mono text-xs">{issue.sku}</td>
      <td className="py-3 pr-4">
        <span
          className={
            "inline-flex items-center whitespace-nowrap px-2 py-0.5 font-display text-[10px] tracking-[0.16em] uppercase " +
            (issue.kind === "missing_sku"
              ? "bg-flag-red/10 text-flag-red"
              : "bg-azure-soft text-azure-deep")
          }
        >
          {issue.kind === "missing_sku" ? "SKU gone" : "Price drift"}
        </span>
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {issue.expectedPosPrice.toFixed(2)}
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {issue.livePosPrice != null ? issue.livePosPrice.toFixed(2) : "—"}
      </td>
    </tr>
  );
}

function PushLog({
  rows,
  failedCount,
}: {
  rows: PushLogRow[];
  failedCount: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-[1.5px]">
          Push log
        </h2>
        <RetryPosButton failedCount={failedCount} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length === 0
          ? "No POS pushes yet."
          : `${rows.length} most recent push attempts, newest first.`}
      </p>
      {rows.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                <th className="py-3 pr-4">When</th>
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Kind</th>
                <th className="py-3 pr-4">Result</th>
                <th className="py-3 pr-4">HTTP</th>
                <th className="py-3 pr-4">Tries</th>
                <th className="py-3 pr-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                    {DATE_FMT.format(new Date(r.createdAt))}
                  </td>
                  <td className="py-3 pr-4 font-display tabular-nums">
                    {r.orderNumber}
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {r.kind === "status_update" ? "Status" : "Create"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 font-display text-[10px] tracking-[0.16em] uppercase " +
                        (r.status === "sent"
                          ? "bg-flag-green/15 text-flag-green"
                          : "bg-flag-red/10 text-flag-red")
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-xs">
                    {r.httpStatus ?? "—"}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-xs">
                    {r.attempts}
                  </td>
                  <td className="py-3 pr-4 max-w-xs text-xs text-muted-foreground">
                    {r.error ? (
                      <span className="line-clamp-2 break-words">{r.error}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "bad";
}) {
  const toneClass =
    tone === "ok"
      ? "text-flag-green"
      : tone === "bad"
        ? "text-flag-red"
        : "text-foreground";
  return (
    <div className="border border-border bg-card px-4 py-3">
      <div className={`font-display text-2xl tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
