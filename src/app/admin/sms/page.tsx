import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadSmsLogs, maskPhone } from "@/lib/admin/sms-logs";

export const metadata: Metadata = {
  title: "SMS log · Admin",
  alternates: { canonical: "/admin/sms" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dubai",
});

export default async function AdminSmsLogPage() {
  const logs = await loadSmsLogs(300);
  const failed = logs.filter((l) => !l.ok).length;

  return (
    <section className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.7} aria-hidden />
          Dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
          SMS verification log
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {logs.length === 0
            ? "No verification SMS yet."
            : `${logs.length} most recent OTP events${failed > 0 ? ` · ${failed} failed` : ""}. “Code sent” means Twilio accepted the send; “Code check” is a customer entering the code.`}
        </p>

        {logs.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                      {DATE_FMT.format(new Date(l.createdAt))}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{maskPhone(l.phone)}</td>
                    <td className="px-5 py-3">
                      {l.kind === "send" ? "Code sent" : "Code check"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] ${
                          l.ok
                            ? "bg-flag-green/15 text-flag-green"
                            : "bg-flag-red/15 text-flag-red"
                        }`}
                      >
                        {l.ok ? "OK" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {l.detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
