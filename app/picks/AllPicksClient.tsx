"use client";

import { useMemo, useState } from "react";
import SimPickCard from "@/lib/picks/SimPickCard";
import TeamLogo from "@/components/TeamLogo";
import SwapLogoBox from "@/components/picks/SwapLogoBox";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import type { SimPickCard as SimPickCardType } from "@/lib/loadSimPickCards";
import type { SwapGroup } from "@/lib/loadSwapGroups";
import { evStyles } from "@/lib/picks/evColor";
import { getPickTypeInfo, pickTypeBucket, PICK_BUCKETS, type PickBucket } from "@/lib/picks/utils";

type SortKey = "ev" | "year" | "round";

const SORTS: [SortKey, string][] = [["ev", "Value"], ["year", "Year"], ["round", "Round"]];

const TEAMS = [
    "ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
    "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS"
];

function abbrFor(fullName: string): string {
    return TEAM_FULL_TO_ABBR[fullName] ?? fullName;
}

/* Best/Mid/Worst label for a pick at position i within an n-pick swap pool. */
function evPosLabel(i: number, total: number): string {
    if (i === 0) return "Best EV";
    if (i === total - 1) return "Worst EV";
    return "Mid EV";
}

/* A single EV box + projected-slot box, matching the regular pick card column. */
function MetricPair({ label, ev, round, slot, year }: {
    label: string; ev: number; round: number; slot: number | undefined; year: number;
}) {
    const { bg, text, glow } = evStyles(ev, round);
    return (
        <div className="flex flex-col gap-2 w-[72px] sm:w-[84px] shrink-0">
            <div className={`rounded-md ${bg} ${text} ${glow} px-2 py-1.5 flex flex-col items-center justify-center`}>
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                    {label}
                </span>
                <span className="text-lg font-black leading-none mt-0.5">{ev.toFixed(1)}</span>
            </div>
            <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                <span className="opacity-60 uppercase text-[9px] font-bold">{year <= 2026 ? "Slot" : "Proj. Slot"}</span>
                <div className="font-mono font-bold text-sm">
                    {typeof slot === "number" ? slot.toFixed(1) : "—"}
                </div>
            </div>
        </div>
    );
}

/* ─── SwapGroupCard ─────────────────────────────────────────
   A swap is rendered as the SAME card shell as a regular pick
   (matching TeamSimPickCard on the team pages): a split logo box
   for the pool, R#/year pills, the canonical type pill, and the
   value column. The whole card links to the best pick in the pool;
   the detail page shows the full pool → recipient breakdown.       */
function SwapGroupCard({ group }: { group: SwapGroup }) {
    const typeInfo = getPickTypeInfo(group.pick_type);
    const poolAbbrs = group.entries.map(e => abbrFor(e.pick.original_team));
    const { bg, text, glow } = evStyles(group.bestEv, group.round);

    const best = group.entries[0];
    const bestAbbr = abbrFor(best.pick.original_team);
    const href = `/picks/${best.pick.year}/${best.pick.round}/${bestAbbr.toLowerCase()}`;

    // Unprotected swaps resolve deterministically to one pick per team, so we show
    // each pick's EV + slot (Best/Mid/Worst) instead of a vague range. Protected
    // swaps stay on the range layout since their outcome is conditional.
    const perEntryEvs =
        (group.pick_type === "unpro_swap"  && group.entries.length === 2) ||
        (group.pick_type === "triple_swap" && group.entries.length === 3);
    const evEntries = perEntryEvs
        ? [...group.entries].sort((a, b) => b.pick.ev - a.pick.ev)
        : [];

    return (
        <a
            href={href}
            className="group relative flex items-center justify-between gap-4 rounded-xl border border-white/20 hover:border-white/40 px-4 py-3 bg-neutral-900/40 backdrop-blur-sm overflow-hidden before:absolute before:inset-0 before:bg-[url('/noise.svg')] before:opacity-[0.8] before:pointer-events-none transition-colors duration-150"
        >
            {/* GLOSS HOVER SHEEN */}
            <div className="absolute inset-0 bg-linear-to-b from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded-xl" />

            {/* LEFT — POOL LOGOS + META */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                    {poolAbbrs.length >= 2
                        ? <SwapLogoBox abbrs={poolAbbrs} />
                        : <TeamLogo abbr={poolAbbrs[0]} noLink />}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        R{group.round}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                        {group.year}
                    </div>
                </div>

                <div className="flex flex-col leading-tight min-w-0 gap-1">
                    <span className="text-sm font-semibold truncate">
                        {poolAbbrs.join(" / ")}
                    </span>
                    <span className="text-[11px] opacity-60 truncate">
                        {group.entries.length}-team {typeInfo.label.toLowerCase()}
                    </span>
                    <span
                        className="inline-block w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-neutral-900/60 mt-0.5"
                        style={{ color: typeInfo.borderColor, borderColor: typeInfo.borderColor + "70" }}
                        title={typeInfo.description}
                    >
                        {typeInfo.label}
                    </span>
                </div>
            </div>

            {/* RIGHT — METRICS */}
            {perEntryEvs ? (
                <div className="flex gap-2 shrink-0">
                    {evEntries.map((e, i) => (
                        <MetricPair
                            key={e.pick.pick_id}
                            label={evPosLabel(i, evEntries.length)}
                            ev={e.pick.ev}
                            round={group.round}
                            slot={e.pick.expected_slot}
                            year={group.year}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2 shrink-0 w-[90px]">
                    <div className={`rounded-md ${bg} ${text} ${glow} px-2 py-1.5 flex flex-col items-center justify-center`}>
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-none">
                            Best EV
                        </span>
                        <span className="text-lg font-black leading-none mt-0.5">
                            {group.bestEv.toFixed(1)}
                        </span>
                    </div>

                    <div className="rounded-md bg-neutral-800/80 border border-white/5 px-2 py-1 text-[10px] text-center flex flex-col justify-center">
                        <span className="opacity-60 uppercase text-[9px] font-bold">Range</span>
                        <div className="font-mono font-bold text-sm">
                            {group.worstEv.toFixed(0)}–{group.bestEv.toFixed(0)}
                        </div>
                    </div>
                </div>
            )}
        </a>
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
    const [typeFilter, setTypeFilter] = useState<PickBucket | "all">("all");

    // Only show buckets that actually exist in the current data set.
    const buckets = useMemo(() => {
        const present = new Set<PickBucket>();
        picks.forEach(p => present.add(pickTypeBucket(p.pick_type)));
        swapGroups.forEach(g => present.add(pickTypeBucket(g.pick_type)));
        return PICK_BUCKETS.filter(b => present.has(b));
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
        if (typeFilter !== "all")  filteredPicks = filteredPicks.filter(p => pickTypeBucket(p.pick_type) === typeFilter);

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
        if (typeFilter !== "all")  filteredSwaps = filteredSwaps.filter(g => pickTypeBucket(g.pick_type) === typeFilter);

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

    // Active filters surfaced as removable chips (sort is excluded — it's always set).
    const activeFilters: { key: string; label: string; clear: () => void }[] = [
        yearFilter  !== "all" && { key: "year",  label: String(yearFilter), clear: () => setYearFilter("all") },
        roundFilter !== "all" && { key: "round", label: roundFilter === 1 ? "1st Round" : "2nd Round", clear: () => setRoundFilter("all") },
        fromFilter  !== "all" && { key: "from",  label: `From ${fromFilter}`, clear: () => setFromFilter("all") },
        ownerFilter !== "all" && { key: "owner", label: `Owner ${ownerFilter}`, clear: () => setOwnerFilter("all") },
        typeFilter  !== "all" && { key: "type",  label: typeFilter, clear: () => setTypeFilter("all") },
    ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

    const clearAll = () => {
        setYearFilter("all"); setRoundFilter("all");
        setFromFilter("all"); setOwnerFilter("all"); setTypeFilter("all");
    };

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold">All Picks</h1>
                <p className="text-sm opacity-60">
                    League-wide draft assets · {totalCount} picks · {swapGroups.length} swap groups
                </p>
            </header>

            {/* CONTROLS */}
            <div className="space-y-3">
                {/* Sort + result count */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-widest opacity-40 font-semibold">Sort</span>
                        <div className="flex gap-1 text-xs">
                            {SORTS.map(([k, label]) => (
                                <button
                                    key={k}
                                    onClick={() => setSortKey(k)}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${
                                        sortKey === k
                                            ? "bg-white text-black font-semibold"
                                            : "bg-white/5 border border-white/10 hover:bg-white/10"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-xs opacity-50 tabular-nums">{displayItems.length} shown</span>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2 text-sm">
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

                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value === "all" ? "all" : e.target.value as PickBucket)}
                        className="glass-select"
                    >
                        <option value="all">All Types</option>
                        {buckets.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                {/* Active filter chips */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {activeFilters.map(f => (
                            <button
                                key={f.key}
                                onClick={f.clear}
                                className="group inline-flex items-center gap-1.5 rounded-full border border-[#E6B85C]/40 bg-[#E6B85C]/10 px-2.5 py-1 text-[11px] font-medium text-[#E6B85C] hover:bg-[#E6B85C]/20 transition-colors"
                            >
                                {f.label}
                                <span className="opacity-60 group-hover:opacity-100">✕</span>
                            </button>
                        ))}
                        <button
                            onClick={clearAll}
                            className="text-[11px] opacity-50 hover:opacity-100 underline underline-offset-2 transition-opacity"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="space-y-3">
                {displayItems.map((item) =>
                    item.kind === "pick"
                        ? <SimPickCard key={item.data.pick_id} pick={item.data} />
                        : <SwapGroupCard key={item.data.swap_id} group={item.data} />
                )}
            </div>
        </div>
    );
}
