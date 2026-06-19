import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
} from "@/lib/delivery-map";

interface MapEmbedProps {
  lat?: number;
  lng?: number;
  query?: string;
  title?: string;
}

export function MapEmbed({
  lat,
  lng,
  query,
  title = "Napoli 7 location map",
}: MapEmbedProps) {
  const src = query
    ? buildGoogleMapsEmbedUrl(query)
    : lat !== undefined && lng !== undefined
      ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
      : "";
  const searchUrl = query ? buildGoogleMapsSearchUrl(query) : null;
  if (!src) {
    return (
      <div className="grid w-full h-[280px] md:h-[400px] place-items-center border border-border bg-card text-sm text-muted-foreground">
        Map preview unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-[280px] md:h-[400px] block border border-border bg-card"
        allowFullScreen
      />
      {searchUrl ? (
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:underline"
        >
          Open exact pin in Maps
        </a>
      ) : null}
    </div>
  );
}
