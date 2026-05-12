import TeamLogo from "@/components/TeamLogo";
import { teamColors } from "@/components/teamColors";
// 1. Import your metadata
import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";

type OwnerSlice = {
    owner: string;
    implied_value: number;
};

type Props = {
    pick: any;
    slices: OwnerSlice[];
};

/* ============================
   COLOR HELPERS
============================ */
function pickTypeBorder(pickType?: string) {
    if (!pickType) return "border-neutral-700";
    const t = pickType.toLowerCase();
    if (t === "protected") return "border-blue-700";
    if (t === "unprotected") return "border-[#E6B85C]";
    if (t === "swap") return "border-purple-700";
    if (t === "protection_backup") return "border-neutral-700";
    return "border-amber-500";
}

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
    if (val >= 48) return { bg: "bg-[#0c6926]", text: "text-white"};
    if (val >= 40) return { bg: "bg-[#48662e]", text: "text-white"};

    // MID TIER (Yellow-Greens)
    if (val >= 32) return { bg: "bg-[#c4c43f]", text: "text-black"};
    if (val >= 25) return { bg: "bg-[#dae35f]", text: "text-black"};

    // BORDERLINE TIER (Oranges)
    if (val >= 18) return { bg: "bg-[#f5c242]", text: "text-black"};
    if (val >= 10) return { bg: "bg-[#c98040]", text: "text-black"};

    // LOW TIER (Reds)
    if (val >= 7.5) return { bg: "bg-[#ab483f]", text: "text-white"};
    if (val >= 5) return { bg: "bg-red-900", text: "text-white" };
    return { bg: "bg-red-900", text: "text-white", glow: "" };
}

export default function CompactPickCard({ pick, slices }: Props) {
    const isFunctional = pick.resolution_rate === 1;
    const primarySlice = slices[0];
    const hasSlice = Boolean(primarySlice);
    const originAbbr = pick.original_team_abbr ?? pick.original_team ?? null;
    const isOwnPick = hasSlice && pick.original_team === primarySlice.owner;

    // 2. Logic to get the City Name
    const ownerFullName = primarySlice?.owner ?? "";
    const ownerAbbr = TEAM_FULL_TO_ABBR[ownerFullName];
    const ownerCity = ownerAbbr ? TEAM_METADATA[ownerAbbr].city : ownerFullName;

    const val = typeof pick.EV === "number" ? pick.EV : 0;
    const { bg, text, glow } = getStashValueStyles(val);

    return (
        <div
            className={`
            relative flex items-center justify-between gap-6
            rounded-xl border border-white
            px-4 py-3
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
            {/* LEFT — LOGO + META */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                    <TeamLogo abbr={originAbbr} />

                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        R{pick.round}
                    </div>

                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        {pick.year}
                    </div>
                </div>

                <div className="flex flex-col leading-tight min-w-0 gap-0.5">
                    <span className="text-sm font-semibold truncate">
                        {/* 3. Use the city name here */}
                        Owned by {ownerCity || "—"}
                    </span>

                    <span className="text-[11px] opacity-60">
                        {isOwnPick ? "Own pick" : `From ${pick.original_team}`}
                    </span>

                    {pick.pick_type && (
                        <span className={`inline-block w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-neutral-300 bg-neutral-800 ${pickTypeBorder(pick.pick_type)}`}>
                            {pick.pick_type}
                        </span>
                    )}
                </div>
            </div>

            {/* RIGHT — PROJECTED METRICS */}
            <div className="flex flex-col items-end gap-1 shrink-0">

                <div className="flex flex-col gap-2 w-180px">
                    {/* STASH VALUE (PRIMARY) */}
                    <div className={`col-span-2 rounded-md ${bg} ${text} ${glow} px-2 py-1.5 flex flex-col items-center justify-center transition-all duration-300`}>
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                            Stash Value
                        </span>
                        <span className="text-lg font-black leading-none mt-0.5">
                            {typeof pick.EV === "number"
                                ? pick.EV.toFixed(1)
                                : "—"}
                        </span>
                    </div>

                    {/* PROJECTED SLOT */}
                    <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                        <span className="opacity-60 uppercase text-[9px] font-bold">Proj. Slot</span>
                        <div className="font-mono font-bold text-sm">
                            {typeof pick.expected_draft_slot === "number"
                                ? pick.expected_draft_slot.toFixed(1)
                                : "—"}
                        </div>
                    </div>
                </div>

                {!isFunctional && (
                    <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-tight">
                        unresolved
                    </span>
                )}
            </div>
        </div>
    );
}