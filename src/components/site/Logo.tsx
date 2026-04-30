import Image from "next/image";
import Link from "next/link";

export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      aria-label="Napoli 7 — home"
      className={`inline-flex items-center gap-3 leading-none ${className}`}
    >
      <Image
        src="/logo.png"
        alt=""
        width={56}
        height={56}
        priority
        className="h-12 w-12 md:h-14 md:w-14 shrink-0 select-none"
      />
      <span
        className={`hidden sm:flex flex-col leading-none ${
          variant === "light" ? "text-white" : "text-foreground"
        }`}
      >
        <span className="font-display text-base font-bold tracking-[0.18em] uppercase">
          Napoli 7
        </span>
        <span
          className={`text-[10px] mt-1 tracking-[0.2em] uppercase ${
            variant === "light" ? "text-white/60" : "text-muted-foreground"
          }`}
        >
          Pizza · Ajman
        </span>
      </span>
    </Link>
  );
}
