import { teamLogos } from "@/lib/teamLogos";

type TeamLogoProps = {
  abbr: string;
  size?: number;
  variant?: "single" | "swap" | "hero";
  noLink?: boolean;
};

const VARIANT_SIZE_MAP: Record<
  NonNullable<TeamLogoProps["variant"]>,
  number
> = {
  single: 64, // default pick cards
  swap: 40,   // swap cards (two logos)
  hero: 96,   // team pages / headers
};

export default function TeamLogo({
  abbr,
  size,
  variant = "single",
  noLink = false,
}: TeamLogoProps) {
  const finalSize = size ?? VARIANT_SIZE_MAP[variant];

  const img = (
    <div
      className="rounded-md border border-neutral-300 bg-[#0a0a0a] overflow-hidden flex items-center justify-center"
      style={{ width: finalSize, height: finalSize }}
    >
      <img
        src={teamLogos[abbr]}
        alt={abbr}
        className="h-full w-full object-cover"
      />
    </div>
  );

  if (noLink) return img;
  return (
    <a href={`/teams/${abbr.toLowerCase()}`} className="block">
      {img}
    </a>
  );
}
