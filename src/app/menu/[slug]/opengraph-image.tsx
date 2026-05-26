import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/catalog";

export const runtime = "nodejs";
export const alt = "Napoli 7 menu item";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Params {
  slug: string;
}

export default async function Image({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  const title = product?.name ?? "Napoli 7";
  const italic = product?.nameIt ?? "Authentic Neapolitan pizza";
  const description = product?.description ?? "Caputo flour, San Marzano DOP";
  const price = product ? `${product.price.toFixed(2)} AED` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#1E3A8A",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#34A5DC",
          }}
        >
          Napoli 7 · Ajman
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 36,
              fontStyle: "italic",
              opacity: 0.85,
            }}
          >
            {italic}
          </div>
          <div
            style={{
              fontSize: 28,
              opacity: 0.75,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          <span>napoli7.com</span>
          {price ? (
            <span style={{ color: "#34A5DC", letterSpacing: 2 }}>{price}</span>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
