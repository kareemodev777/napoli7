import type { Metadata } from "next";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { DISPLAY_TIME_ZONE } from "@/lib/format-date";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { ResendEmailCell } from "@/components/admin/ResendEmailCell";
import { MessageReadCell } from "@/components/admin/MessageReadCell";
import { MessageCell } from "@/components/admin/MessageCell";

export const metadata: Metadata = {
  title: "Messages · Admin",
  alternates: { canonical: "/admin/messages" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ContactMessageRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  emailSent: boolean;
  emailError: string | null;
  createdAt: string;
  read: boolean;
}

async function loadMessages(): Promise<ContactMessageRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, phone, email, message, email_sent, email_error, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    emailSent: row.email_sent,
    emailError: row.email_error,
    createdAt: row.created_at,
    read: row.read_at != null,
  }));
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
});

export default async function AdminMessagesPage() {
  const messages = await loadMessages();
  const unread = messages.filter((m) => !m.read).length;

  return (
    <section className="px-6 md:px-10 py-12">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
          Contact messages
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {messages.length === 0
            ? "No messages yet."
            : `${messages.length} messages${unread > 0 ? ` · ${unread} unread` : ""}, newest first. Click “New” to mark a message read.`}
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">When</th>
                <th className="py-3 pr-4">From</th>
                <th className="py-3 pr-4">Message</th>
                <th className="py-3 pr-4">Email</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr
                  key={m.id}
                  className={`border-t border-border align-top ${
                    m.read ? "" : "bg-brand-soft/30"
                  }`}
                >
                  <td className="py-4 pr-4">
                    <MessageReadCell messageId={m.id} read={m.read} />
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                    {DATE_FMT.format(new Date(m.createdAt))}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium">{m.name}</div>
                    <a
                      href={`tel:${m.phone}`}
                      className="block text-xs text-muted-foreground hover:text-foreground"
                    >
                      {m.phone}
                    </a>
                    <a
                      href={`mailto:${m.email}`}
                      className="block text-xs text-muted-foreground hover:text-foreground"
                    >
                      {m.email}
                    </a>
                  </td>
                  <td className="py-4 pr-4">
                    <MessageCell
                      message={m.message}
                      from={`${m.name} · ${m.email}`}
                    />
                  </td>
                  <td className="py-4 pr-4">
                    <ResendEmailCell
                      messageId={m.id}
                      sent={m.emailSent}
                      error={m.emailError}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
