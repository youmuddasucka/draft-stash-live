import TeamLogo from "@/components/TeamLogo";
import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import type { SimTeamPickCard } from "@/lib/loadSimTeamPickCards";
import { evStyles } from "@/lib/picks/evColor";

function pickTypeBadgeClass(pickType: string) {
    const t = pickType.toLowerCase();
    if (t === "unprotected") return "border-[#E6B85C]";
    if (t.includes("swap")) return "border-purple-700";
    if (t.startsWith("pro_")) return "border-blue-700";
    return "border-neutral-600";
}


type Props = {
    card: SimTeamPickCard;
    expectedSlot?: number;
    swapPosition?: string;
};

export default function TeamSimPickCard({ card, expectedSlot, swapPosition }: Props) {
    const originAbbr = TEAM_FULL_TO_ABBR[card.original_team] ?? card.original_team;
    const isOwnPick = card.original_team === card.team;
    const showProb = !swapPosition && card.prob < 0.999;

    const { bg, text, glow } = evStyles(card.conditional_ev, card.round);
    const href = `/picks/${card.year}/${card.round}/${originAbbr.toLowerCase()}`;

    return (
        <a href={href} className={`group relative flex items-center justify-between gap-4 rounded-xl border px-4 py-3 bg-neutral-900/40 backdrop-blur-sm overflow-hidden before:absolute before:inset-0 before:bg-[url('/noise.svg')] before:opacity-[0.8] before:pointer-events-none transition-colors duration-150 ${card.frozen ? "border-cyan-400/60 hover:border-cyan-400/90" : "border-white/20 hover:border-white/40"}`}>
            {/* GLOSS HOVER SHEEN */}
            <div className="absolute inset-0 bg-linear-to-b from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded-xl" />

            {/* ICY OVERLAY */}
            {card.frozen && (
                <div className="absolute inset-0 z-20 pointer-events-none rounded-xl bg-linear-to-br from-cyan-400/10 via-blue-300/5 to-cyan-600/10 backdrop-blur-[1px]">
                    <div className="absolute top-1.5 right-2 text-cyan-300 text-sm select-none">🧊</div>
                </div>
            )}

            {/* LEFT — LOGO + META */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                    <TeamLogo abbr={originAbbr} />
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        R{card.round}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        {card.year}
                    </div>
                </div>

                <div className="flex flex-col leading-tight min-w-0 gap-0.5">
                    {swapPosition ? (
                        <span className="text-sm font-semibold text-white/90">
                            {swapPosition}
                        </span>
                    ) : (
                        <span className="text-sm font-semibold truncate">
                            {isOwnPick ? "Own pick" : `From ${card.original_team}`}
                        </span>
                    )}

                    {showProb && (
                        <span className="text-[11px] text-[#E6B85C] font-bold">
                            {Math.round(card.prob * 100)}% chance
                        </span>
                    )}

                    {swapPosition ? (() => {
                        const isBest  = swapPosition.startsWith("Best");
                        const isWorst = swapPosition.startsWith("Worst");
                        const label   = isBest ? "SWAP BEST" : isWorst ? "SWAP WORST" : "SWAP MID";
                        const color   = isBest ? "#22c55e"   : isWorst ? "#ef4444"    : "#f59e0b";
                        return (
                            <span className="inline-block w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-neutral-300 bg-neutral-800 mt-0.5"
                                style={{ borderColor: color }}>
                                {label}
                            </span>
                        );
                    })() : (
                        <span className={`inline-block w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-neutral-300 bg-neutral-800 mt-0.5 ${pickTypeBadgeClass(card.pick_type)}`}>
                            {card.pick_type.replace(/_/g, " ")}
                        </span>
                    )}
                </div>
            </div>

            {/* RIGHT — METRICS */}
            <div className="flex flex-col gap-2 shrink-0 w-[90px]">
                <div className={`rounded-md ${bg} ${text} ${glow} px-2 py-1.5 flex flex-col items-center justify-center`}>
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                        {showProb ? "Cond. EV" : "EV"}
                    </span>
                    <span className="text-lg font-black leading-none mt-0.5">
                        {card.conditional_ev.toFixed(3)}
                    </span>
                </div>

                {expectedSlot !== undefined && (
                    <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                        <span className="opacity-60 uppercase text-[9px] font-bold">Proj. Slot</span>
                        <div className="font-mono font-bold text-sm">{expectedSlot.toFixed(1)}</div>
                    </div>
                )}
            </div>
        </a>
    );
}
