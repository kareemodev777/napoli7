export type TimeMeridiem = "AM" | "PM";

export type TimeSelection = {
  hour: string;
  minute: string;
  meridiem: TimeMeridiem;
};

export const TIME_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
export const TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
export const TIME_MERIDIEM_OPTIONS: TimeMeridiem[] = ["AM", "PM"];

const DEFAULT_TIME: TimeSelection = {
  hour: "12",
  minute: "00",
  meridiem: "AM",
};

function normalizeHour(hour24: number): { hour: string; meridiem: TimeMeridiem } {
  const meridiem: TimeMeridiem = hour24 >= 12 ? "PM" : "AM";
  const hour = ((hour24 + 11) % 12) + 1;
  return { hour: String(hour), meridiem };
}

export function parseTimeValue(value: string | null | undefined): TimeSelection | null {
  if (!value) return null;
  const [hourPart, minutePart] = value.split(":");
  const hour24 = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isInteger(hour24) || !Number.isInteger(minute)) return null;
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;

  const { hour, meridiem } = normalizeHour(hour24);
  return {
    hour,
    minute: String(minute).padStart(2, "0"),
    meridiem,
  };
}

export function formatTimeValue(selection: TimeSelection): string | null {
  const hour = Number(selection.hour);
  const minute = Number(selection.minute);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  const normalizedHour =
    selection.meridiem === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;

  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function defaultTimeSelection(value: string | null | undefined): TimeSelection {
  return parseTimeValue(value) ?? DEFAULT_TIME;
}

export function readTimeValue(formData: FormData, prefix: string): string | null {
  const selection = {
    hour: String(formData.get(`${prefix}_hour`) ?? ""),
    minute: String(formData.get(`${prefix}_minute`) ?? ""),
    meridiem: String(formData.get(`${prefix}_meridiem`) ?? "") as TimeMeridiem,
  };

  if (selection.meridiem !== "AM" && selection.meridiem !== "PM") {
    return null;
  }

  return formatTimeValue(selection);
}
