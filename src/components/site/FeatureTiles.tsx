import type { LucideIcon } from "lucide-react";

export interface FeatureTile {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureTilesProps {
  tiles: FeatureTile[];
}

export function FeatureTiles({ tiles }: FeatureTilesProps) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-[1140px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.title}
                className="bg-background p-8 md:p-10 flex flex-col items-start gap-4"
              >
                <Icon
                  className="h-8 w-8 text-brand"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <h3 className="font-display text-base md:text-lg font-medium leading-tight">
                  {tile.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tile.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
