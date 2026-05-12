import TeamLogo from "@/components/TeamLogo";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";

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
    if (val >= 56)
        return {
            bg: "bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B]",
            text: "text-black",
            glow: "shadow-[0_0_20px_rgba(255,215,0,0.6)]",
        };

    if (val >= 48) return { bg: "bg-[#0c6926]", text: "text-white" };
    if (val >= 40) return { bg: "bg-[#48662e]", text: "text-white" };

    if (val >= 32) return { bg: "bg-[#c4c43f]", text: "text-black" };
    if (val >= 25) return { bg: "bg-[#dae35f]", text: "text-black" };

    if (val >= 18) return { bg: "bg-[#f5c242]", text: "text-black" };
    if (val >= 10) return { bg: "bg-[#c98040]", text: "text-black" };

    if (val >= 7.5) return { bg: "bg-[#ab483f]", text: "text-white" };
    if (val >= 5) return { bg: "bg-red-900", text: "text-white" };

    return { bg: "bg-red-900", text: "text-white" };
}

export default function CompactPickSwapCardBothValues({
    pick,
    slices,
    originAbbr,
    swapTeamAbbr,
}: Props) {
    const isFunctional = pick.resolution_rate === 1;
    const rules = pick.rules;

    const activeAllocations =
        rules?.allocation ||
        rules?.levels?.[rules.levels.length - 1]?.allocation ||
        [];

    const bestTeamFull = activeAllocations.find((a: any) => a.rank === "mf")?.to;
    const worstTeamFull = activeAllocations.find((a: any) => a.rank === "lf")?.to;

    const getAbbr = (fullName?: string) =>
        fullName ? TEAM_FULL_TO_ABBR[fullName] ?? fullName : "—";

    const bestAbbr = getAbbr(bestTeamFull);
    const worstAbbr = getAbbr(worstTeamFull);

    const baseVal = typeof pick.EV === "number" ? pick.EV : 0;

    const bestVal =
        typeof pick.best_EV === "number" ? pick.best_EV : baseVal;

    const worstVal =
        typeof pick.worst_EV === "number" ? pick.worst_EV : baseVal;

    const bestSlot =
        typeof pick.best_expected_draft_slot === "number"
            ? pick.best_expected_draft_slot.toFixed(1)
            : "—";

    const worstSlot =
        typeof pick.worst_expected_draft_slot === "number"
            ? pick.worst_expected_draft_slot.toFixed(1)
            : "—";

    const bestStyles = getStashValueStyles(bestVal);
    const worstStyles = getStashValueStyles(worstVal);

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
            {/* LEFT */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
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

                <div className="flex flex-col justify-center leading-tight min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] opacity-60">Best to:</span>
                        <span className="text-xl font-bold truncate text-white uppercase">
                            {bestAbbr}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] opacity-60">Worst to:</span>
                        <span className="text-xl font-bold truncate text-white uppercase">
                            {worstAbbr}
                        </span>
                    </div>

                    <span className="inline-block w-fit rounded-md border border-purple-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-neutral-300 mt-0.5">
                        swap
                    </span>
                </div>
            </div>

            {/* RIGHT — OUTCOMES */}
            <div className="flex flex-col gap-1.5 shrink-0 ml-4 w-[240px]">
                {/* BEST */}
                <div className="grid grid-cols-[50px_44px_auto_auto] items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black text-emerald-400 text-right">
                        Best
                    </span>

                    <span className="text-sm font-black text-white uppercase text-center">
                        {bestAbbr}
                    </span>

                    {/* VALUE */}
                    <div
                        className={`rounded-md ${bestStyles.bg} ${bestStyles.text} ${bestStyles.glow}
                        px-2 py-1 min-w-[56px] flex flex-col items-center leading-none`}
                    >
                        <span className="text-[8px] uppercase font-black opacity-70">
                            Value
                        </span>
                        <span className="text-sm font-black">
                            {bestVal.toFixed(1)}
                        </span>
                    </div>

                    {/* SLOT */}
                    <div
                        className="rounded-md bg-neutral-800/80 border border-white/10
                        px-2 py-1 min-w-[56px] flex flex-col items-center leading-none"
                    >
                        <span className="text-[8px] uppercase font-black opacity-60">
                            Slot
                        </span>
                        <span className="text-sm font-mono font-bold text-white">
                            {bestSlot}
                        </span>
                    </div>
                </div>

                {/* WORST */}
                <div className="grid grid-cols-[50px_44px_auto_auto] items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black text-red-400 text-right">
                        Worst
                    </span>

                    <span className="text-sm font-black text-white uppercase text-center">
                        {worstAbbr}
                    </span>

                    {/* VALUE */}
                    <div
                        className={`rounded-md ${worstStyles.bg} ${worstStyles.text}
                        px-2 py-1 min-w-[56px] flex flex-col items-center leading-none`}
                    >
                        <span className="text-[8px] uppercase font-black opacity-70">
                            Value
                        </span>
                        <span className="text-sm font-black">
                            {worstVal.toFixed(1)}
                        </span>
                    </div>

                    {/* SLOT */}
                    <div
                        className="rounded-md bg-neutral-800/80 border border-white/10
                        px-2 py-1 min-w-[56px] flex flex-col items-center leading-none"
                    >
                        <span className="text-[8px] uppercase font-black opacity-60">
                            Slot
                        </span>
                        <span className="text-sm font-mono font-bold text-white">
                            {worstSlot}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
