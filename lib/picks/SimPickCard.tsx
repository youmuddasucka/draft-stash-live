import TeamLogo from "@/components/TeamLogo";
import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import type { SimPickCard as SimPickCardType } from "@/lib/loadSimPickCards";
import { evStyles } from "@/lib/picks/evColor";

function pickTypeBadgeClass(pickType: string) {
    const t = pickType.toLowerCase();
    if (t === "unprotected") return "border-[#E6B85C]";
    if (t.includes("swap")) return "border-purple-700";
    if (t.startsWith("pro_")) return "border-blue-700";
    if (t.includes("backup")) return "border-neutral-600";
    return "border-neutral-700";
}

function abbr(fullName: string): string {
    return TEAM_FULL_TO_ABBR[fullName] ?? fullName;
}

function city(fullName: string): string {
    const a = abbr(fullName);
    return TEAM_METADATA[a]?.city ?? fullName;
}

export default function SimPickCard({ pick }: { pick: SimPickCardType }) {
    const originAbbr = TEAM_FULL_TO_ABBR[pick.original_team] ?? pick.original_team;
    const { bg, text, glow } = evStyles(pick.ev, pick.round);

    const primaryOwner = pick.ownership[0];
    const isMultiOwner = pick.ownership.length > 1;
    const isSingleOwner = !isMultiOwner;
    const isOwnPick = isSingleOwner && pick.original_team === primaryOwner?.team;

    const href = `/picks/${pick.year}/${pick.round}/${originAbbr.toLowerCase()}`;

    return (
        <a href={href} className={`group relative flex items-center justify-between gap-6 rounded-xl border px-4 py-3 bg-neutral-900/40 backdrop-blur-sm overflow-hidden before:absolute before:inset-0 before:bg-[url('/noise.svg')] before:opacity-[0.8] before:pointer-events-none transition-colors duration-150 ${pick.frozen ? "border-cyan-400/60 hover:border-cyan-400/90" : "border-white/20 hover:border-white/40"}`}>
            {/* GLOSS HOVER SHEEN */}
            <div className="absolute inset-0 bg-linear-to-b from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded-xl" />

            {/* ICY OVERLAY */}
            {pick.frozen && (
                <div className="absolute inset-0 z-20 pointer-events-none rounded-xl bg-linear-to-br from-cyan-400/10 via-blue-300/5 to-cyan-600/10 backdrop-blur-[1px]">
                    <div className="absolute top-1.5 right-2 text-cyan-300 text-sm select-none">🧊</div>
                </div>
            )}

            {/* LEFT — LOGO + META */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                    <TeamLogo abbr={originAbbr} noLink />
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        R{pick.round}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        {pick.year}
                    </div>
                </div>

                {/* OWNERSHIP */}
                <div className="flex flex-col leading-tight min-w-0 gap-1">
                    {isSingleOwner ? (
                        <>
                            <span className="text-sm font-semibold truncate">
                                {isOwnPick ? "Own pick" : `Owned by ${city(primaryOwner.team)}`}
                            </span>
                            {!isOwnPick && (
                                <span className="text-[11px] opacity-60 truncate">
                                    From {pick.original_team}
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="space-y-0.5">
                            {pick.ownership
                                .filter(o => o.prob > 0.001)
                                .sort((a, b) => b.prob - a.prob)
                                .map(o => (
                                    <div key={o.team} className="flex items-center gap-2">
                                        <div className="w-16 shrink-0">
                                            <div
                                                className="h-1 rounded-full bg-white/30"
                                                style={{ width: `${Math.round(o.prob * 100)}%`, backgroundColor: "rgba(230,184,92,0.7)" }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-mono text-white/80 w-8 shrink-0">
                                            {Math.round(o.prob * 100)}%
                                        </span>
                                        <span className="text-[11px] opacity-80 truncate">
                                            {city(o.team)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}

                    <span className={`inline-block w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide text-neutral-300 bg-neutral-800 mt-0.5 ${pickTypeBadgeClass(pick.pick_type)}`}>
                        {pick.pick_type.replace(/_/g, " ")}
                    </span>
                </div>
            </div>

            {/* RIGHT — METRICS */}
            <div className="flex flex-col gap-2 shrink-0 w-[90px]">
                <div className={`rounded-md ${bg} ${text} ${glow} px-2 py-1.5 flex flex-col items-center justify-center`}>
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                        EV
                    </span>
                    <span className="text-lg font-black leading-none mt-0.5">
                        {pick.ev.toFixed(1)}
                    </span>
                </div>

                <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                    <span className="opacity-60 uppercase text-[9px] font-bold">Proj. Slot</span>
                    <div className="font-mono font-bold text-sm">
                        {typeof pick.expected_slot === "number"
                            ? pick.expected_slot.toFixed(1)
                            : "—"}
                    </div>
                </div>
            </div>
        </a>
    );
}
