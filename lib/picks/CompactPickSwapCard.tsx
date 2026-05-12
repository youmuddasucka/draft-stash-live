import TeamLogo from "@/components/TeamLogo";
import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";

type OwnerSlice = {
    owner: string;
    implied_value: number;
};

type Props = {
    pick: any;
    slices: OwnerSlice[];
    originAbbr: string;
    swapTeamAbbr: string;
};

/* ============================
   REFINED VALUE COLOR HELPER
============================ */
function getStashValueStyles(val: number) {
    // ELITE TIER
    if (val >= 56) return {
        bg: "bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B]",
        text: "text-black",
        border: "border-[#FFFACD]",
        glow: "shadow-[0_0_20px_rgba(255,215,0,0.6)]"
    };

    // HIGH TIER (Greens)
    if (val >= 48) return { bg: "bg-[#0c6926]", text: "text-white" };
    if (val >= 40) return { bg: "bg-[#48662e]", text: "text-white" };

    // MID TIER (Yellow-Greens)
    if (val >= 32) return { bg: "bg-[#c4c43f]", text: "text-black" };
    if (val >= 25) return { bg: "bg-[#dae35f]", text: "text-black" };

    // BORDERLINE TIER (Oranges)
    if (val >= 18) return { bg: "bg-[#f5c242]", text: "text-black" };
    if (val >= 10) return { bg: "bg-[#c98040]", text: "text-black" };

    // LOW TIER (Reds)
    if (val >= 7.5) return { bg: "bg-[#ab483f]", text: "text-white" };
    if (val >= 5) return { bg: "bg-red-900", text: "text-white" };
    return { bg: "bg-red-900", text: "text-white", glow: "" };
}

export default function CompactPickSwapCard({
    pick,
    slices,
    originAbbr,
    swapTeamAbbr,
}: Props) {
    const isFunctional = pick.resolution_rate === 1;
    const primarySlice = slices[0];
    const rules = pick.rules;

    const activeAllocations =
        rules?.allocation ||
        rules?.levels?.[rules.levels.length - 1]?.allocation ||
        [];

    const bestTeamFull = activeAllocations.find((a: any) => a.rank === "mf")?.to;
    const worstTeamFull = activeAllocations.find((a: any) => a.rank === "lf")?.to;

    const getAbbr = (fullName?: string) => {
        if (!fullName) return "—";
        return TEAM_FULL_TO_ABBR[fullName] ?? fullName;
    };

    const val = typeof pick.EV === "number" ? pick.EV : 0;
    const { bg, text, glow } = getStashValueStyles(val);

    const Banners = () => (
        <>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[10px] font-black text-black leading-none">
                R{pick.round}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[10px] font-black text-black leading-none">
                {pick.year}
            </div>
        </>
    );

    return (
        <div
            className={`
        relative flex items-center justify-between gap-6
        rounded-xl border border-white
        px-4 py-3 min-h-[90px]
        ${isFunctional ? "" : "opacity-70"}
        bg-neutral-900/40 backdrop-blur-sm
        bg-linear-to-br from-white/4 to-black/8
        overflow-hidden
        before:absolute before:inset-0
        before:bg-[url('/noise.svg')]
        before:opacity-[0.8]
        before:pointer-events-none
      `}
        >
            {/* LEFT — LOGOS + BEST/WORST */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* LOGOS */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative size-10">
                        <TeamLogo abbr={originAbbr} variant="swap" />
                        <Banners />
                    </div>

                    <div className="opacity-40 shrink-0">
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m16 3 4 4-4 4" />
                            <path d="M20 7H4" />
                            <path d="m8 21-4-4 4-4" />
                            <path d="M4 17h16" />
                        </svg>
                    </div>

                    <div className="relative size-10">
                        <TeamLogo abbr={swapTeamAbbr} variant="swap" />
                        <Banners />
                    </div>
                </div>

                {/* BEST / WORST */}
                <div className="flex flex-col justify-center leading-tight min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] opacity-60 whitespace-nowrap">
                            Best to:  
                        </span>
                        <span className="text-xl font-bold truncate text-white uppercase tracking-tight">
                            {getAbbr(bestTeamFull)}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] opacity-60 whitespace-nowrap">
                            Worst to: 
                        </span>
                        <span className="text-xl font-bold truncate text-white uppercase tracking-tight">
                            {getAbbr(worstTeamFull)}
                        </span>
                    </div>

                    {/* badge sits like your other cards: tight + no extra vertical push */}
                    <span
                        className="
      inline-block w-fit rounded-md border border-purple-700
      bg-neutral-800 px-1.5 py-0.5
      text-[9px] font-mono uppercase tracking-wide
      text-neutral-300
      mt-0.5
    "
                    >
                        swap
                    </span>
                </div>
            </div>

            {/* RIGHT — METRICS */}
            <div className="flex flex-col items-end shrink-0 ml-4">
                <div className="flex flex-col gap-2 w-180px">
                    {/* STASH VALUE */}
                    <div
                        className={`rounded-md ${bg} ${text} ${glow}
            px-2 py-1.5 flex flex-col items-center justify-center`}
                    >
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                            Stash Value
                        </span>
                        <span className="text-lg font-black leading-none mt-0.5">
                            {val.toFixed(1)}
                        </span>
                    </div>

                    {/* PROJECTED SLOT */}
                    <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                        <span className="opacity-60 uppercase text-[9px] font-bold">
                            Proj. Slot
                        </span>
                        <div className="font-mono font-bold text-sm">
                            {typeof pick.expected_draft_slot === "number"
                                ? pick.expected_draft_slot.toFixed(1)
                                : "—"}
                        </div>
                    </div>
                </div>

                {!isFunctional && (
                    <span className="mt-1 text-[9px] text-yellow-500 font-bold uppercase tracking-tight">
                        unresolved
                    </span>
                )}
            </div>
        </div>
    );
}
