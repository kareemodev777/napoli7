import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";

export const ORDERING_TIME_ZONE = "Asia/Dubai";

export type OpeningHoursRow = {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  note?: string | null;
};

export type OrderingDay = {
  dayOfWeek: number;
  label: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note?: string | null;
};

export type OrderingAvailability = {
  isOpen: boolean;
  timezone: string;
  nowLabel: string;
  currentDayLabel: string;
  currentTimeLabel: string;
  message: string;
  nextOpenLabel: string | null;
  nextOpenAt: string | null;
  nextCloseLabel: string | null;
  nextCloseAt: string | null;
  hours: OrderingDay[];
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DEFAULT_HOURS: OrderingDay[] = [
  { dayOfWeek: 0, label: DAY_LABELS[0], isClosed: true, opensAt: null, closesAt: null },
  { dayOfWeek: 1, label: DAY_LABELS[1], isClosed: true, opensAt: null, closesAt: null },
  { dayOfWeek: 2, label: DAY_LABELS[2], isClosed: false, opensAt: "12:30", closesAt: "00:00" },
  { dayOfWeek: 3, label: DAY_LABELS[3], isClosed: false, opensAt: "12:30", closesAt: "00:00" },
  { dayOfWeek: 4, label: DAY_LABELS[4], isClosed: false, opensAt: "12:30", closesAt: "00:00" },
  { dayOfWeek: 5, label: DAY_LABELS[5], isClosed: false, opensAt: "12:30", closesAt: "00:00" },
  { dayOfWeek: 6, label: DAY_LABELS[6], isClosed: false, opensAt: "12:30", closesAt: "00:00" },
];

function minuteLabel(minutes: number): string {
  const normalized = minutes % (24 * 60);
  if (normalized === 0 && minutes >= 24 * 60) {
    return "12:00 AM";
  }
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseMinutes(value: string | null): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function zonedNowParts(timeZone: string): {
  dayOfWeek: number;
  currentMinutes: number;
  nowLabel: string;
  currentDayLabel: string;
  currentTimeLabel: string;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sunday";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const dayOfWeek = DAY_LABELS.findIndex((label) => label === weekday);

  return {
    dayOfWeek: dayOfWeek < 0 ? 0 : dayOfWeek,
    currentMinutes: hour * 60 + minute,
    nowLabel: `${weekday} ${minuteLabel(hour * 60 + minute)}`,
    currentDayLabel: weekday,
    currentTimeLabel: minuteLabel(hour * 60 + minute),
  };
}

function normalizeRows(rows: OpeningHoursRow[] | null | undefined): OrderingDay[] {
  const map = new Map<number, OpeningHoursRow>();
  for (const row of rows ?? []) {
    map.set(row.day_of_week, row);
  }

  return DEFAULT_HOURS.map((day) => {
    const row = map.get(day.dayOfWeek);
    if (!row) return day;
    return {
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      isClosed: Boolean(row.is_closed),
      opensAt: row.is_closed ? null : row.opens_at,
      closesAt: row.is_closed ? null : row.closes_at,
      note: row.note ?? undefined,
    };
  });
}

export function isOrderingOpenAt(
  day: OrderingDay,
  currentMinutes: number,
): boolean {
  if (day.isClosed) return false;
  const open = parseMinutes(day.opensAt);
  const close = parseMinutes(day.closesAt);
  if (open === null || close === null) return false;
  if (close > open) {
    return currentMinutes >= open && currentMinutes < close;
  }
  // Handles a late close such as 00:00, where the restaurant stays open until
  // the end of the day.
  return currentMinutes >= open || currentMinutes < close;
}

function findNextOpen(hours: OrderingDay[], startDay: number, startMinutes: number) {
  for (let offset = 0; offset < 8; offset += 1) {
    const day = hours[(startDay + offset) % 7];
    if (day.isClosed) continue;
    const open = parseMinutes(day.opensAt);
    const close = parseMinutes(day.closesAt);
    if (open === null || close === null) continue;
    const isToday = offset === 0;
    if (isToday && isOrderingOpenAt(day, startMinutes)) {
      return {
        isOpen: true,
        nextOpenLabel: `${day.label} ${minuteLabel(startMinutes)}`,
        nextOpenAt: null,
        nextCloseLabel: `${day.label} ${minuteLabel(close > open ? close : 24 * 60)}`,
        nextCloseAt: `${day.label} ${minuteLabel(close > open ? close : 24 * 60)}`,
      };
    }
    if (!isToday || startMinutes < open) {
      return {
        isOpen: false,
        nextOpenLabel: `${day.label} ${minuteLabel(open)}`,
        nextOpenAt: `${day.label} ${minuteLabel(open)}`,
        nextCloseLabel: `${day.label} ${minuteLabel(close > open ? close : 24 * 60)}`,
        nextCloseAt: `${day.label} ${minuteLabel(close > open ? close : 24 * 60)}`,
      };
    }
  }
  return {
    isOpen: false,
    nextOpenLabel: null,
    nextOpenAt: null,
    nextCloseLabel: null,
    nextCloseAt: null,
  };
}

export async function getOrderingAvailability(): Promise<OrderingAvailability> {
  let hours = DEFAULT_HOURS;

  if (HAS_SUPABASE) {
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data } = await supabase
        .from("opening_hours")
        .select("day_of_week, is_closed, opens_at, closes_at, note")
        .order("day_of_week", { ascending: true });
      hours = normalizeRows(data as OpeningHoursRow[] | null | undefined);
    } catch (error) {
      console.error("[ordering-hours] Falling back to defaults:", error);
    }
  }

  const now = zonedNowParts(ORDERING_TIME_ZONE);
  const today = hours[now.dayOfWeek] ?? hours[0];
  const currentlyOpen = isOrderingOpenAt(today, now.currentMinutes);
  const next = currentlyOpen
    ? {
        isOpen: true,
        nextOpenLabel: `${today.label} ${now.currentTimeLabel}`,
        nextOpenAt: null,
        nextCloseLabel:
          today.closesAt === "00:00"
            ? `${today.label} 12:00 AM`
            : `${today.label} ${minuteLabel(parseMinutes(today.closesAt) ?? 0)}`,
        nextCloseAt:
          today.closesAt === "00:00"
            ? `${today.label} 12:00 AM`
            : `${today.label} ${minuteLabel(parseMinutes(today.closesAt) ?? 0)}`,
      }
    : findNextOpen(hours, now.dayOfWeek, now.currentMinutes);

  return {
    isOpen: currentlyOpen,
    timezone: ORDERING_TIME_ZONE,
    nowLabel: now.nowLabel,
    currentDayLabel: now.currentDayLabel,
    currentTimeLabel: now.currentTimeLabel,
    message: currentlyOpen
      ? `We’re open now in Ajman. Orders close again at ${next.nextCloseLabel ?? "midnight"}.`
      : `We’re closed right now. Orders open again at ${next.nextOpenLabel ?? "our next opening"}.`,
    nextOpenLabel: next.nextOpenLabel,
    nextOpenAt: next.nextOpenAt,
    nextCloseLabel: next.nextCloseLabel,
    nextCloseAt: next.nextCloseAt,
    hours,
  };
}

export function formatOrderingWindow(day: OrderingDay): string {
  if (day.isClosed || !day.opensAt || !day.closesAt) return "Closed";
  const opens = minuteLabel(parseMinutes(day.opensAt) ?? 0);
  const closes =
    day.closesAt === "00:00"
      ? "12:00 AM"
      : minuteLabel(parseMinutes(day.closesAt) ?? 0);
  return `${opens} – ${closes}`;
}

export function getOrderingHoursSummary(hours: OrderingDay[]): string {
  return hours.map((day) => `${day.label}: ${formatOrderingWindow(day)}`).join(" · ");
}
