import { teamLogos } from "@/lib/teamLogos";

type Props = {
    /** Team abbreviations in the swap pool. 2 → diagonal split, 3 → tri-split. */
    abbrs: string[];
    size?: number;
};

/**
 * clip-path polygons keyed by pool size, one per logo slot.
 * - 2 teams: diagonal from top-right → bottom-left (two triangles).
 * - 3 teams: top / right / bottom-left sectors meeting at center (groundwork).
 */
const CLIPS: Record<number, string[]> = {
    2: [
        "polygon(0% 0%, 65% 0%, 35% 100%, 0% 100%)",     // left region
        "polygon(65% 0%, 100% 0%, 100% 100%, 35% 100%)", // right region
    ],
    3: [
        "polygon(0% 0%, 33.333% 0%, 33.333% 100%, 0% 100%)",        // left third
        "polygon(33.333% 0%, 66.667% 0%, 66.667% 100%, 33.333% 100%)", // middle third
        "polygon(66.667% 0%, 100% 0%, 100% 100%, 66.667% 100%)",     // right third
    ],
};

/**
 * Visual center (cx, cy in %) of each region, so the logo sits centered inside
 * its slice rather than showing the box edge. Applied as a translate on the
 * full-box image (offset from the box center at 50%, 50%).
 */
const CENTERS: Record<number, Array<[number, number]>> = {
    2: [
        [25, 50],  // left region
        [75, 50],  // right region
    ],
    3: [
        [16.667, 50], // left third
        [50, 50],     // middle third
        [83.333, 50], // right third
    ],
};

/** Divider line segments (x1,y1 → x2,y2 in %) overlaid on the split, per pool size. */
const DIVIDERS: Record<number, Array<[number, number, number, number]>> = {
    2: [[65, 0, 35, 100]],
    3: [
        [33.333, 0, 33.333, 100],   // left divider
        [66.667, 0, 66.667, 100],   // right divider
    ],
};

export default function SwapLogoBox({ abbrs, size = 64 }: Props) {
    const count = abbrs.length;
    const clips = CLIPS[count];

    // Fallback to a single logo for unsupported counts (1, or 4+).
    if (!clips) {
        return (
            <div
                className="rounded-md border border-neutral-300 bg-[#0a0a0a] overflow-hidden flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                <img src={teamLogos[abbrs[0]]} alt={abbrs[0]} className="h-full w-full object-cover" />
            </div>
        );
    }

    const dividers = DIVIDERS[count] ?? [];
    const centers = CENTERS[count];

    return (
        <div
            className="relative rounded-md border border-neutral-300 bg-[#0a0a0a] overflow-hidden"
            style={{ width: size, height: size }}
        >
            {abbrs.slice(0, count).map((abbr, i) => {
                const [cx, cy] = centers[i];
                return (
                    <div
                        key={`${abbr}-${i}`}
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: clips[i] }}
                    >
                        <img
                            src={teamLogos[abbr]}
                            alt={abbr}
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{ transform: `translate(${cx - 50}%, ${cy - 50}%)` }}
                        />
                    </div>
                );
            })}

            {/* divider lines */}
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full pointer-events-none"
            >
                {dividers.map(([x1, y1, x2, y2], i) => (
                    <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(0,0,0,0.9)"
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
            </svg>
        </div>
    );
}
