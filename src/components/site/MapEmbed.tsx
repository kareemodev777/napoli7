interface MapEmbedProps {
  lat: number;
  lng: number;
  title?: string;
}

export function MapEmbed({ lat, lng, title = "Napoli 7 location map" }: MapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  return (
    <div className="relative w-full overflow-hidden border border-border">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-[280px] md:h-[400px] block"
        allowFullScreen
      />
    </div>
  );
}
