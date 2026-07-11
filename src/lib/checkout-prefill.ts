import { displayEmail } from "@/lib/auth/placeholder-email";

export interface CheckoutInitialAddress {
  street: string;
  area: string;
  flat?: string;
  notes?: string;
}

export interface CheckoutInitialDetails {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  deliveryAddress?: CheckoutInitialAddress;
}

type UserMetadata = Record<string, unknown> | null | undefined;

function stringFromMetadata(metadata: UserMetadata, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function splitCustomerName(name: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function buildCheckoutInitialDetails(args: {
  email?: string | null;
  metadata?: UserMetadata;
  address?: CheckoutInitialAddress | null;
}): CheckoutInitialDetails {
  const metadata = args.metadata;
  const fullName =
    stringFromMetadata(metadata, "full_name") ??
    stringFromMetadata(metadata, "name") ??
    stringFromMetadata(metadata, "display_name");
  const splitName = splitCustomerName(fullName);

  const firstName =
    stringFromMetadata(metadata, "first_name") ??
    stringFromMetadata(metadata, "firstName") ??
    splitName.firstName;
  const lastName =
    stringFromMetadata(metadata, "last_name") ??
    stringFromMetadata(metadata, "lastName") ??
    splitName.lastName;
  const phone =
    stringFromMetadata(metadata, "mobile") ??
    stringFromMetadata(metadata, "phone") ??
    stringFromMetadata(metadata, "phone_number") ??
    stringFromMetadata(metadata, "phoneNumber");
  // A phone-only account's auth email is a placeholder, not an inbox. Show the
  // field empty rather than prefilling a synthetic address the customer has never
  // seen and would have to delete.
  const rawEmail = args.email?.trim() || stringFromMetadata(metadata, "email");
  const email = displayEmail(rawEmail) || undefined;

  return {
    firstName,
    lastName,
    phone,
    email,
    deliveryAddress: args.address ?? undefined,
  };
}

export function chooseCheckoutArea(args: {
  zones: { area: string }[];
  preferredArea?: string | null;
}): string {
  const preferred = args.preferredArea?.trim();
  if (preferred && args.zones.some((zone) => zone.area === preferred)) {
    return preferred;
  }
  return args.zones[0]?.area ?? "";
}
