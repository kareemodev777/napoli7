import { NextResponse } from "next/server";
import { getOrderingAvailability } from "@/lib/ordering-hours";

export async function GET() {
  const availability = await getOrderingAvailability();
  return NextResponse.json(availability, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
