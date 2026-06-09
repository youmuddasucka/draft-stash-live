"use client";

import { useMemo, useState } from "react";
import SimPickCard from "@/lib/picks/SimPickCard";
import { TEAM_FULL_TO_ABBR, TEAM_METADATA } from "@/lib/teamMetadata";
import { teamColors } from "@/components/teamColors";
import type { SimPickCard as SimPickCardType } from "@/lib/loadSimPickCards";
import type { SwapGroup } from "@/lib/loadSwapGroups";
import { evStyles } from "@/lib/picks/evColor";

type SortKey = "ev" | "year" | "round";

const TEAMS = [
    "ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
    "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS"
];

const SWAP_POS_COLOR = ["#22c55e", "#f59e0b", "#ef4444"];
const SWAP_POS_LABEL = ["BEST", "MID", "WORST"];

function posColor(idx: number, total: number): string {
    if (idx === 0) return SWAP_POS_COLOR[0];
    if (idx === total - 1) return SWAP_POS_COLOR[2];
    return SWAP_POS_COLOR[1];
}
function posLabel(idx: number, total: number): string {
    if (idx === 0) return SWAP_POS_LABEL[0];
    if (idx === total - 1) return SWAP_POS_LABEL[2];
    return SWAP_POS_LABEL[1];
}


const PICK_TYPE_BORDER: Record<string, string> = {
    unprotected:       "#E6B85C",
    unpro_swap:        "#a855f7",
    pro_swap:          "#a855f7",
    triple_swap:       "#ec4899",
    pro_triple_swap:   "#ec4899",
    nested_swap:       "#a855f7",
    pro_pick:          "#3b82f6",
    pro_backup:        "#3b82f6",
    unpro_backup:      "#3b82f6",
    pro_backup_branched: "#3b82f6",
    special:           "#6b7280",
};

function typeBorderColor(pt: string): string {
    return PICK_TYPE_BORDER[pt] ?? "rgba(255,255,255,0.15)";
}

function roundLabel(r: number): string {
    return r === 1 ? "1st" : r === 2 ? "2nd" : `R${r}`;
}

function abbrFor(fullName: string): string {
    return TEAM_FULL_TO_ABBR[fullName] ?? fullName;
}

/* ─── SwapGroupCard ─────────────────────────────────────── */
function SwapGroupCard({ group }: { group: SwapGroup }) {
    const borderColor = typeBorderColor(group.pick_type);
    const typeTag = group.pick_type.replace(/_/g, " ").toUpperCase();
    const total = group.entries.length;

    return (
        <div
            className="group relative rounded-xl border overflow-hidden bg-neutral-900/40 backdrop-blur-sm transition-colors duration-150"
            style={{ borderColor: borderColor + "55" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = borderColor + "99")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor + "55")}
        >
            {/* GLOSS HOVER SHEEN */}
            <div className="absolute inset-0 bg-linear-to-b from-white/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10" />

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                {/* Team logos */}
                <div className="flex items-center gap-2">
                    {group.entries.map((entry, i) => {
                        const abbr = abbrFor(entry.pick.original_team);
                        return (
                            <div key={entry.pick.pick_id} className="flex items-center gap-2">
                                {i > 0 && <span className="text-white/25 text-sm">×</span>}
                                <img
                                    src={`/team-logos/${abbr}.png`}
                                    alt={abbr}
                                    className="w-7 h-7 object-cover rounded"
                                />
                            </div>
                        );
                    })}
                    <span className="text-xs opacity-50 ml-2">
                        {group.year} · {roundLabel(group.round)} Round
                    </span>
                </div>

                {/* Type + EV range */}
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border"
                        style={{ color: borderColor, borderColor: borderColor + "70" }}>
                        {typeTag}
                    </span>
                    <span className="text-xs font-mono opacity-50">
                        EV {group.bestEv.toFixed(1)} – {group.worstEv.toFixed(1)}
                    </span>
                </div>
            </div>

            {/* PICK ROWS — each is its own link */}
            <div className="divide-y divide-white/5">
                {group.entries.map((entry, i) => {
                    const origAbbr = abbrFor(entry.pick.original_team);
                    const recColor = entry.recAbbr ? (teamColors[entry.recAbbr] ?? "#888") : "#888";
                    const pc = posColor(i, total);
                    const pl = posLabel(i, total);
                    const { bg: evBg, text: evText } = evStyles(entry.pick.ev, entry.pick.round);
                    const href = `/picks/${entry.pick.year}/${entry.pick.round}/${origAbbr.toLowerCase()}`;

                    return (
                        <a
                            key={entry.pick.pick_id}
                            href={href}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/4 transition-colors"
                        >
                            {/* POSITION BADGE */}
                            <span
                                className="text-[9px] font-black uppercase tracking-wider w-12 shrink-0 text-center py-0.5 rounded border"
                                style={{ color: pc, borderColor: pc + "60", background: pc + "15" }}
                            >
                                {pl}
                            </span>

                            {/* ORIGIN TEAM */}
                            <img
                                src={`/team-logos/${origAbbr}.png`}
                                alt={origAbbr}
                                className="w-6 h-6 object-cover rounded shrink-0"
                            />
                            <span className="text-xs font-bold w-9 shrink-0">{origAbbr}</span>

                            {/* EV */}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${evBg} ${evText}`}>
                                {entry.pick.ev.toFixed(1)}
                            </span>

                            {/* SLOT */}
                            <span className="text-[10px] opacity-40 shrink-0 w-14">
                                slot {entry.pick.expected_slot.toFixed(0)}
                            </span>

                            {/* ARROW */}
                            <span className="text-white/20 text-xs shrink-0">→</span>

                            {/* RECIPIENT */}
                            {entry.recAbbr ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <img
                                        src={`/team-logos/${entry.recAbbr}.png`}
                                        alt={entry.recAbbr}
                                        className="w-5 h-5 object-cover rounded shrink-0"
                                    />
                                    <span
                                        className="text-xs font-semibold truncate"
                                        style={{ color: recColor }}
                                    >
                                        {TEAM_METADATA[entry.recAbbr]?.city ?? entry.recipient}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] opacity-30 italic">TBD</span>
                            )}

                            <span className="ml-auto text-white/15 text-xs shrink-0">→</span>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── AllPicksClient ────────────────────────────────────── */
type Props = {
    picks: SimPickCardType[];
    swapGroups: SwapGroup[];
    initialYear?: number;
    initialRound?: 1 | 2;
};

type SortablePick   = { kind: "pick";  data: SimPickCardType; ev: number; year: number; round: number };
type SortableSwap   = { kind: "swap";  data: SwapGroup;       ev: number; year: number; round: number };
type DisplayItem    = SortablePick | SortableSwap;

export default function AllPicksClient({ picks, swapGroups, initialYear, initialRound }: Props) {
    const [sortKey, setSortKey]       = useState<SortKey>("ev");
    const [yearFilter, setYearFilter] = useState<number | "all">(initialYear ?? "all");
    const [roundFilter, setRoundFilter] = useState<1 | 2 | "all">(initialRound ?? "all");
    const [fromFilter, setFromFilter] = useState<string | "all">("all");
    const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
    const [typeFilter, setTypeFilter] = useState<string | "all">("all");

    const pickTypes = useMemo(() => {
        const types = new Set<string>();
        picks.forEach(p => types.add(p.pick_type));
        swapGroups.forEach(g => types.add(g.pick_type));
        return Array.from(types).sort();
    }, [picks, swapGroups]);

    const displayItems = useMemo((): DisplayItem[] => {
        // ── Regular picks ──
        let filteredPicks = [...picks];
        if (yearFilter !== "all")  filteredPicks = filteredPicks.filter(p => p.year === yearFilter);
        if (roundFilter !== "all") filteredPicks = filteredPicks.filter(p => p.round === roundFilter);
        if (fromFilter !== "all")  filteredPicks = filteredPicks.filter(p =>
            abbrFor(p.original_team) === fromFilter
        );
        if (ownerFilter !== "all") filteredPicks = filteredPicks.filter(p =>
            p.ownership.some(o => abbrFor(o.team) === ownerFilter)
        );
        if (typeFilter !== "all")  filteredPicks = filteredPicks.filter(p => p.pick_type === typeFilter);

        // ── Swap groups ──
        let filteredSwaps = [...swapGroups];
        if (yearFilter !== "all")  filteredSwaps = filteredSwaps.filter(g => g.year === yearFilter);
        if (roundFilter !== "all") filteredSwaps = filteredSwaps.filter(g => g.round === roundFilter);
        if (fromFilter !== "all")  filteredSwaps = filteredSwaps.filter(g =>
            g.entries.some(e => abbrFor(e.pick.original_team) === fromFilter)
        );
        if (ownerFilter !== "all") filteredSwaps = filteredSwaps.filter(g =>
            g.entries.some(e =>
                e.recAbbr === ownerFilter ||
                e.pick.ownership.some(o => abbrFor(o.team) === ownerFilter)
            )
        );
        if (typeFilter !== "all")  filteredSwaps = filteredSwaps.filter(g => g.pick_type === typeFilter);

        // ── Combine ──
        const items: DisplayItem[] = [
            ...filteredPicks.map(p => ({ kind: "pick" as const, data: p, ev: p.ev, year: p.year, round: p.round })),
            ...filteredSwaps.map(g => ({ kind: "swap" as const, data: g, ev: g.bestEv, year: g.year, round: g.round })),
        ];

        switch (sortKey) {
            case "year":  items.sort((a, b) => a.year !== b.year ? a.year - b.year : b.ev - a.ev); break;
            case "round": items.sort((a, b) => a.round !== b.round ? a.round - b.round : b.ev - a.ev); break;
            default:      items.sort((a, b) => b.ev - a.ev);
        }

        return items;
    }, [picks, swapGroups, sortKey, yearFilter, roundFilter, fromFilter, ownerFilter, typeFilter]);

    // Count distinct picks — a pick can appear in more than one swap group's
    // entries, so flattening would double-count it.
    const totalCount = picks.length + new Set(
        swapGroups.flatMap(g => g.entries.map(e => e.pick.pick_id))
    ).size;

    return (
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">All Picks</h1>
                <p className="text-sm opacity-60">
                    League-wide draft assets · {totalCount} picks · {swapGroups.length} swap groups
                </p>
            </header>

            {/* CONTROLS */}
            <div className="flex flex-wrap gap-3 text-sm">
                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="glass-select">
                    <option value="ev">Sort: Value</option>
                    <option value="year">Sort: Year</option>
                    <option value="round">Sort: Round</option>
                </select>

                <select
                    value={yearFilter}
                    onChange={e => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="glass-select"
                >
                    <option value="all">All Years</option>
                    {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={roundFilter}
                    onChange={e => setRoundFilter(e.target.value === "all" ? "all" : Number(e.target.value) as 1 | 2)}
                    className="glass-select"
                >
                    <option value="all">All Rounds</option>
                    <option value={1}>1st Round</option>
                    <option value={2}>2nd Round</option>
                </select>

                <select value={fromFilter} onChange={e => setFromFilter(e.target.value)} className="glass-select">
                    <option value="all">From: All Teams</option>
                    {TEAMS.map(t => <option key={t} value={t}>From: {t}</option>)}
                </select>

                <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="glass-select">
                    <option value="all">Owner: All Teams</option>
                    {TEAMS.map(t => <option key={t} value={t}>Owner: {t}</option>)}
                </select>

                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-select">
                    <option value="all">All Types</option>
                    {pickTypes.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                </select>
            </div>

            <p className="text-xs opacity-50">{displayItems.length} items shown</p>

            {/* LIST */}
            <div className="space-y-3">
                {displayItems.map((item, i) =>
                    item.kind === "pick"
                        ? <SimPickCard key={item.data.pick_id} pick={item.data} />
                        : <SwapGroupCard key={item.data.swap_id} group={item.data} />
                )}
            </div>
        </div>
    );
}
