import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Napoli 7 — Authentic Italian Neapolitan Pizza, Ajman";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "#1E3A8A",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 32,
            color: "#34A5DC",
          }}
        >
          Authentic Italian Neapolitan Pizza
        </div>
        <div
          style={{
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 0.9,
          }}
        >
          NAPOLI 7
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 40,
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          <span>Ajman</span>
          <span>·</span>
          <span>napoli7.com</span>
        </div>
      </div>
    ),
    size
  );
}
