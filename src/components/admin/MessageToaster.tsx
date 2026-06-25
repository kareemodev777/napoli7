"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Unique channel name per mount so a re-subscribe never reuses a live channel.
let channelSeq = 0;

interface ContactMessageRow {
  id: string;
  name: string | null;
  message: string | null;
}

/**
 * Live toast for incoming contact-form messages. Subscribes to inserts on
 * `contact_messages` via Supabase Realtime (admin-gated by RLS) and raises a
 * Sonner toast with a snippet and a shortcut to the messages log. Mounted once
 * in the admin layout so it fires on any admin page.
 */
export function MessageToaster() {
  const router = useRouter();

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = getBrowserSupabase();

    const channel = supabase
      .channel(`admin-contact-messages-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_messages" },
        (payload: RealtimePostgresInsertPayload<ContactMessageRow>) => {
          const row = payload.new;
          const name = row.name?.trim() || "Someone";
          const snippet = (row.message ?? "").trim();
          toast(`New message from ${name}`, {
            description:
              snippet.length > 90 ? `${snippet.slice(0, 90)}…` : snippet || undefined,
            icon: <Mail className="h-4 w-4 text-brand" strokeWidth={1.8} />,
            duration: 8000,
            action: {
              label: "View",
              onClick: () => router.push("/admin/messages"),
            },
          });
          // Keep the messages table fresh if the admin is already looking at it.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
