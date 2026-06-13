import { notFound } from "next/navigation";
import { loadSimPickCards, type SimPickCard } from "@/lib/loadSimPickCards";
import { TEAM_METADATA } from "@/lib/teamMetadata";
import { teamColors } from "@/components/teamColors";
import TeamLogo from "@/components/TeamLogo";
import { evStyles } from "@/lib/picks/evColor";
import PickComments from "@/components/PickComments";
import { SWAP_POS_COLOR } from "@/lib/picks/constants";
import { loadRawPick, loadRawPickById, buildRelatedChain } from "@/lib/picks/loaders";
import {
    getPickTypeInfo, isSwapType, isBackupType, roundLabel,
    abbrFor, cityFor, find2026Entry,
    formatRange, formatCondition, parsePickId, pickLabel, triggerProb,
} from "@/lib/picks/utils";
import RelatedPickRow from "@/components/picks/RelatedPickRow";

// Some team colors are near-black (Brooklyn #111, Spurs #000) and unreadable as
// text on the dark UI. Flip anything too dark to white; readable colors (e.g.
// Houston's red) pass through unchanged.
function readableTextColor(hex: string): string {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.25 ? "#ffffff" : hex;
}

type Props = {
    params: Promise<{ year: string; round: string; team: string }>;
};
export default async function PickSlugPage({ params }: Props) {
    const { year, round, team } = await params;
    const yearNum  = Number(year);
    const roundNum = Number(round);
    const teamAbbr = team.toUpperCase();

    if (!yearNum || !roundNum || !TEAM_METADATA[teamAbbr]) notFound();

    const teamMeta = TEAM_METADATA[teamAbbr];
    const color    = teamColors[teamAbbr] ?? "#444";

    /* ── 2026: resolved draft — render ownership-first layout ── */
    if (yearNum === 2026) {
        const result = find2026Entry(teamAbbr, roundNum);
        if (!result) notFound();

        const { slot, entry } = result;
        const ownerAbbr  = entry.id;
        const ownerMeta  = TEAM_METADATA[ownerAbbr];
        const ownerColor = teamColors[ownerAbbr] ?? "#444";
        const isOwnPick  = !entry.note;

        return (
            <div className="glass-bg min-h-screen">
                <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">

                    <a href={`/teams/${team.toLowerCase()}`}
                        className="inline-flex items-center gap-1.5 text-xs opacity-40 hover:opacity-100 transition-opacity tracking-wide">
                        ← {teamMeta.full}
                    </a>

                    {/* OWNERSHIP HERO */}
                    <div
                        className="glass-surface rounded-2xl border-2 px-5 md:px-8 py-8 md:py-10 flex flex-col items-center gap-5 text-center"
                        style={{ borderColor: ownerColor + "99" }}
                    >
                        <div className="text-[11px] uppercase tracking-widest opacity-40">
                            2026 · {roundLabel(roundNum)} · Pick #{slot}
                        </div>

                        <TeamLogo abbr={ownerAbbr} size={110} />

                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-black" style={{ color: readableTextColor(ownerColor) }}>
                                {ownerMeta?.city ?? ownerAbbr}
                            </h1>
                            <p className="text-base opacity-50 font-semibold">{ownerMeta?.full}</p>
                        </div>

                        {!isOwnPick && (
                            <a
                                href={`/teams/${teamAbbr.toLowerCase()}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <TeamLogo abbr={teamAbbr} size={20} noLink />
                                <span className="text-xs opacity-60">via {teamMeta.full}</span>
                            </a>
                        )}
                    </div>

                    {/* SLOT + ORIGIN ROW */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest opacity-40">Draft Slot</span>
                            <span className="text-4xl md:text-5xl font-black tabular-nums">#{slot}</span>
                        </div>
                        <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
                            <span className="text-[10px] uppercase tracking-widest opacity-40">
                                {isOwnPick ? "Team" : "Original Slot"}
                            </span>
                            <TeamLogo abbr={teamAbbr} size={48} />
                            <span className="text-sm font-bold opacity-80">{teamMeta.city}</span>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    const allPicks    = loadSimPickCards();
    const pickIdMap   = new Map(allPicks.map(p => [p.pick_id, p]));

    const picks = allPicks.filter(p =>
        p.year === yearNum &&
        p.round === roundNum &&
        abbrFor(p.original_team) === teamAbbr
    );

    if (picks.length === 0) notFound();

    return (
        <div className="glass-bg min-h-screen">
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

                <a href={`/teams/${team.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 text-xs opacity-40 hover:opacity-100 transition-opacity tracking-wide">
                    ← {teamMeta.full}
                </a>

                {picks.map((pick) => {
                    const typeInfo  = getPickTypeInfo(pick.pick_type);
                    const isSwap    = isSwapType(pick.pick_type);
                    const { bg, text, glow } = evStyles(pick.ev, pick.round);

                    /* ── Load raw pick to get pool + allocation ── */
                    const rawPick  = loadRawPick(pick.pick_id, teamAbbr);
                    const swapId: string | null = rawPick?.rules?.swap_id ?? null;

                    let pool: string[];
                    let allocation: { rank: string; to: string }[] = [];
                    let hasDirectAllocation = false;

                    if (rawPick?.rules?.pool?.length) {
                        // Simple swap: pool + allocation directly on rules
                        pool = rawPick.rules.pool
                            .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                            .filter((id: string | null) => id && !id.startsWith("TEMP_"));
                        allocation = rawPick.rules.allocation ?? [];
                        hasDirectAllocation = allocation.length > 0;
                    } else if (rawPick?.rules?.levels?.length === 1) {
                        // Single-level triple swap: pool + allocation live in levels[0]
                        const lvl = rawPick.rules.levels[0];
                        pool = (lvl.pool ?? [])
                            .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                            .filter((id: string | null) => id && !id.startsWith("TEMP_"));
                        allocation = lvl.allocation ?? [];
                        hasDirectAllocation = allocation.length > 0;
                    } else if (rawPick?.rules?.levels?.length > 1) {
                        // Multi-level nested swap: flatten all real picks, use sim ownership
                        const seen = new Set<string>();
                        for (const level of rawPick.rules.levels) {
                            for (const e of (level.pool ?? [])) {
                                const id = typeof e === "string" ? e : (e.pick ?? null);
                                if (id && !id.startsWith("TEMP_")) seen.add(id);
                            }
                        }
                        pool = [...seen];
                    } else {
                        pool = [pick.pick_id];
                    }

                    /* ── Resolve full pool from sim data ── */
                    const poolPicks   = pool.map(id => pickIdMap.get(id)).filter(Boolean) as SimPickCard[];
                    const sortedPool  = [...poolPicks].sort((a, b) => b.ev - a.ev);
                    const poolSize    = sortedPool.length;

                    // Use raw JSON type as source of truth (sim output may lag behind JSON edits)
                    const rawPickType = rawPick?.rules?.type ?? pick.pick_type;
                    // Normalize pro_pick schema variants (protection_range vs condition.range, etc.)
                    const proRange: [number, number] | null =
                        rawPickType === "pro_pick"
                            ? (rawPick?.rules?.protection_range ?? rawPick?.rules?.condition?.range ?? null)
                            : rawPickType === "pro_backup"
                                ? (rawPick?.rules?.protection_range ?? null)
                                : null;
                    const proKeeperTeam: string | null = rawPickType === "pro_pick"
                        ? (rawPick?.rules?.if_protected_to ?? rawPick?.rules?.if_in_range_to ?? null)
                        : null;
                    const proRecipientTeam: string | null = rawPickType === "pro_pick"
                        ? (rawPick?.rules?.if_not_protected_to ?? rawPick?.rules?.if_not_in_range_to ?? null)
                        : null;
                    // pro_backup: protected backup with four-way routing (trigger × protection).
                    // Uses if_triggered_and_protected_to etc. — NOT the simple if_triggered_to
                    // fields the generic backup section reads — so it gets a dedicated display.
                    const pbTP: string | null = rawPick?.rules?.if_triggered_and_protected_to ?? null;
                    const pbTN: string | null = rawPick?.rules?.if_triggered_and_not_protected_to ?? null;
                    const pbNP: string | null = rawPick?.rules?.if_not_triggered_and_protected_to ?? null;
                    const pbNN: string | null = rawPick?.rules?.if_not_triggered_and_not_protected_to ?? null;
                    const isProBackup = rawPickType === "pro_backup" &&
                        !!proRange && !!pbTP && !!pbTN && !!pbNP && !!pbNN;
                    // pro_triple_swap is structurally a protected swap with a 3-pick pool —
                    // render the same protection details (lock ranges, conditional pool
                    // entry, fallback) rather than the bare generic swap view.
                    const isProtectedSwap =
                        pick.pick_type === "pro_swap" || rawPickType === "pro_swap" ||
                        pick.pick_type === "pro_triple_swap" || rawPickType === "pro_triple_swap" ||
                        pick.pick_type === "cond_alloc_swap" || rawPickType === "cond_alloc_swap";
                    // Special picks with pool + conditional allocation (custom display)
                    const isSpecialPoolSwap = rawPickType === "special" &&
                        poolPicks.length > 1 &&
                        (rawPick?.rules?.allocation ?? []).some((a: any) => a.if_in_range_to || a.if_not_in_range_to);
                    // Multi-level nested swap
                    const isNestedSwap = rawPickType === "nested_swap";
                    // 7-team two-tier swap group
                    const isSwapGroup = rawPickType === "special" && !!rawPick?.rules?.swap_group;
                    const SG_MAIN_IDS = [
                        "Brooklyn_Nets_2028_1", "Philadelphia_76ers_2028_1",
                        "Phoenix_Suns_2028_1",  "New_York_Knicks_2028_1",
                    ];
                    const SG_SEC_IDS = [
                        "Milwaukee_Bucks_2028_1", "Portland_Trail_Blazers_2028_1",
                        "Washington_Wizards_2028_1",
                    ];
                    const sgMainPicks = isSwapGroup
                        ? SG_MAIN_IDS.map(id => pickIdMap.get(id)).filter(Boolean) as SimPickCard[]
                        : [];
                    const sgSecPicks = isSwapGroup
                        ? SG_SEC_IDS.map(id => pickIdMap.get(id)).filter(Boolean) as SimPickCard[]
                        : [];

                    /* ── Pool entry metadata (protection + fallback per pick) ── */
                    const poolEntryMap = new Map<string, any>();
                    for (const entry of (rawPick?.rules?.pool ?? [])) {
                        if (typeof entry === "string") poolEntryMap.set(entry, null);
                        else if (entry?.pick) poolEntryMap.set(entry.pick as string, entry);
                    }

                    /* ── Allocation condition per pick (Type 2 conditional destination) ── */
                    const allocCondMap = new Map<string, [number, number]>();
                    for (const alloc of (rawPick?.rules?.allocation ?? [])) {
                        if ((alloc.if_in_range_to || alloc.if_not_in_range_to) && alloc.condition?.range) {
                            const rankPick = sortedPool[Number(alloc.rank) - 1];
                            if (rankPick) allocCondMap.set(rankPick.pick_id, alloc.condition.range as [number, number]);
                        }
                    }

                    /* ── Fallback picks (from conditional pool entries) ── */
                    const fallbackEntries: { protectedPickId: string; fallbackPickId: string }[] =
                        (rawPick?.rules?.pool ?? [])
                            .filter((e: any) => typeof e === "object" && e.pick && e.fallback_pick && e.fallback_pick !== "none")
                            .map((e: any) => ({ protectedPickId: e.pick as string, fallbackPickId: e.fallback_pick as string }));

                    function poolPosition(p: SimPickCard): string {
                        const idx = sortedPool.findIndex(s => s.pick_id === p.pick_id);
                        if (idx === 0) return "SWAP BEST";
                        if (idx === poolSize - 1) return "SWAP WORST";
                        return "SWAP MID";
                    }

                    function recipientFor(p: SimPickCard): string | null {
                        if (hasDirectAllocation) {
                            const rank = sortedPool.findIndex(s => s.pick_id === p.pick_id) + 1;
                            const alloc = allocation.find(a => Number(a.rank) === rank);
                            if (alloc?.to) return alloc.to;
                        }
                        return p.ownership[0]?.team ?? null;
                    }

                    function recipientProb(p: SimPickCard): number | null {
                        if (hasDirectAllocation) {
                            const rank = sortedPool.findIndex(s => s.pick_id === p.pick_id) + 1;
                            const alloc = allocation.find(a => Number(a.rank) === rank);
                            if (alloc?.to) return null; // unconditional, no uncertainty
                        }
                        const prob = p.ownership[0]?.prob ?? null;
                        return prob !== null && prob < 0.995 ? prob : null;
                    }

                    /* ── Backup trigger data ── */
                    const isBackup       = isBackupType(pick.pick_type);
                    const rawTriggers: { pick: string; condition: any }[] = rawPick?.rules?.triggers ?? [];
                    const rawBranches: any[]  = rawPick?.rules?.branches ?? [];
                    const if_triggered_to: string | null     = rawPick?.rules?.if_triggered_to ?? null;
                    const if_not_triggered_to: string | null = rawPick?.rules?.if_not_triggered_to ?? null;
                    const trigger_logic: string              = rawPick?.rules?.trigger_logic ?? "OR";
                    const hasTriggers = rawTriggers.length > 0 || rawBranches.length > 0;

                    /* ── Top-level pool (e.g. Utah worst-pick clause) ── */
                    const pickPoolMeta = rawPick?.pool ?? null;
                    const poolMembers: { pick: SimPickCard; raw: any }[] = pickPoolMeta
                        ? allPicks
                            .filter(p => p.year === pick.year && p.round === pick.round)
                            .flatMap(p => {
                                const r = loadRawPickById(p.pick_id);
                                return r?.pool?.pool_id === pickPoolMeta.pool_id ? [{ pick: p, raw: r }] : [];
                            })
                            .sort((a, b) => a.pick.expected_slot - b.pick.expected_slot)
                        : [];

                    /* ── Non-swap ownership ── */
                    const isMulti      = pick.ownership.length > 1 || (rawPick?.rules?.possible_destinations ?? []).length > 1;
                    const primaryOwner = pick.ownership[0];
                    const isOwnPick    = !isMulti && primaryOwner?.team === pick.original_team;
                    const possibleDests: string[] = rawPick?.rules?.possible_destinations ?? [];
                    const ownershipMap = new Map(pick.ownership.map(o => [o.team, o]));
                    const sortedOwners = [
                        ...pick.ownership,
                        ...possibleDests
                            .filter(t => !ownershipMap.has(t))
                            .map(t => ({ team: t, prob: 0, conditional_ev: 0, conditional_slot: null })),
                    ].sort((a, b) => b.prob - a.prob);

                    /* ── Related picks — BFS through JSON references ── */
                    const relatedChain   = buildRelatedChain(pick.pick_id, allPicks);
                    const swapPoolIds    = new Set(sortedPool.map(p => p.pick_id));
                    const relatedPicks   = allPicks.filter(p =>
                        relatedChain.has(p.pick_id) && !swapPoolIds.has(p.pick_id)
                    );

                    /* ── Protected pick ranges (for lock icon in header) ── */
                    const protectedPickRanges = new Map<string, [number, number]>();
                    if (isProtectedSwap) {
                        // Type 1: conditional pool entry
                        for (const entry of (rawPick?.rules?.pool ?? [])) {
                            if (typeof entry === "object" && entry.pick && entry.condition?.range) {
                                protectedPickRanges.set(entry.pick as string, entry.condition.range as [number, number]);
                            }
                        }
                        // Type 2: conditional allocation — the pick at the conditional rank
                        for (const alloc of (rawPick?.rules?.allocation ?? [])) {
                            if ((alloc.if_in_range_to || alloc.if_not_in_range_to) && alloc.condition?.range) {
                                const rankPick = sortedPool[Number(alloc.rank) - 1];
                                if (rankPick) protectedPickRanges.set(rankPick.pick_id, alloc.condition.range as [number, number]);
                            }
                        }
                    }

                    /* ── Dynamic description ── */
                    const pickDescription: string = (() => {
                        // Swap-group picks: friendly intro; the staged breakdown and the
                        // per-pick outcomes below carry the detail.
                        if (isSwapGroup) {
                            const roundStr = pick.round === 1 ? "1st-round" : "2nd-round";
                            return `The ${teamMeta.city} ${pick.year} ${roundStr} pick is one of seven tied together in a two-tier swap. Brooklyn controls the main pool — its own pick plus Phoenix, New York, and Philadelphia (only if it falls 9–30) — and takes the two best. New York takes the worst of the New York, Brooklyn, and Phoenix picks. Whatever is left over feeds a Washington swap that can reach into a second pool with Milwaukee and Portland. See where this pick actually lands, and the full stage-by-stage breakdown, below.`;
                        }

                        if (rawPickType === "pro_pick" && proRange && proKeeperTeam && proRecipientTeam) {
                            const [pMin, pMax] = proRange;
                            const roundStr     = pick.round === 1 ? "1st-round" : "2nd-round";
                            const keeper       = cityFor(proKeeperTeam);
                            const recipient    = cityFor(proRecipientTeam);
                            const protDesc     = pMin === 1 ? `in the top ${pMax}` : `between picks ${pMin}–${pMax}`;
                            const convDesc     = pMin === 1 ? `outside the top ${pMax}` : `outside picks ${pMin}–${pMax}`;
                            const rawFb        = rawPick.rules.fallback_pick;
                            const fbIds: string[] | null = !rawFb || rawFb === "none" ? null
                                : Array.isArray(rawFb) ? rawFb : [rawFb];
                            const fbInfo       = fbIds?.[0] ? parsePickId(fbIds[0]) : null;
                            const fallbackStr  = !fbIds ? ` If it is never triggered, the obligation expires — no pick is owed.`
                                : fbIds.length === 1 && fbInfo
                                    ? ` If it is never triggered, the ${fbInfo.year} ${fbInfo.round === 1 ? "1st" : "2nd"}-round pick conveys to ${recipient} as a fallback.`
                                    : ` If it is never triggered, one of ${fbIds.length} fallback picks conveys to ${recipient}.`;
                            return `The ${teamMeta.city} ${pick.year} ${roundStr} pick is protected ${protDesc}. If it lands there, ${keeper} keeps it.${fallbackStr} If it falls ${convDesc}, it conveys to ${recipient}.`;
                        }

                        if (isProBackup && proRange) {
                            const [pMin, pMax] = proRange;
                            const roundStr  = pick.round === 1 ? "1st-round" : "2nd-round";
                            const protDesc  = pMin === 1 ? `in the top ${pMax}` : `in picks ${pMin}–${pMax}`;
                            const trigger   = rawTriggers[0];
                            const trigInfo  = trigger ? parsePickId(trigger.pick) : null;
                            const trigDesc  = trigger && trigInfo
                                ? `the ${trigInfo.teamAbbr} ${trigInfo.year} ${trigInfo.round === 1 ? "1st" : "2nd"}-round pick ${formatCondition(trigger.condition)}`
                                : "another pick's result";
                            const dest = (team: string) =>
                                team === pick.original_team ? `${cityFor(team)} keeps it` : `it goes to ${cityFor(team)}`;
                            const trigSentence = pbTP === pbTN
                                ? `If ${trigDesc}, ${dest(pbTP!)} no matter where this pick lands.`
                                : `If ${trigDesc}, ${dest(pbTP!)} when this pick lands ${protDesc}; otherwise ${dest(pbTN!)}.`;
                            const notSentence = pbNP === pbNN
                                ? `If the trigger never hits, ${dest(pbNP!)} regardless.`
                                : `If the trigger never hits, ${dest(pbNP!)} when it lands ${protDesc}; otherwise ${dest(pbNN!)}.`;
                            const rawFb = rawPick?.rules?.fallback_pick;
                            const fbInfo = rawFb && rawFb !== "none" ? parsePickId(rawFb as string) : null;
                            const fallbackStr = fbInfo
                                ? ` If this pick never conveys, the ${fbInfo.year} ${fbInfo.round === 1 ? "1st" : "2nd"}-round pick is sent as a fallback.`
                                : "";
                            return `The ${teamMeta.city} ${pick.year} ${roundStr} pick is protected ${protDesc}, and its destination also depends on a trigger. ${trigSentence} ${notSentence}${fallbackStr}`;
                        }

                        if (rawPickType === "unpro_backup" && rawTriggers.length > 0 && if_triggered_to && if_not_triggered_to) {
                            const roundStr = pick.round === 1 ? "1st-round" : "2nd-round";
                            const trigDesc = rawTriggers
                                .map(t => {
                                    const ti = parsePickId(t.pick);
                                    return ti
                                        ? `the ${ti.teamAbbr} ${ti.year} ${ti.round === 1 ? "1st" : "2nd"}-round pick ${formatCondition(t.condition)}`
                                        : `another pick's result`;
                                })
                                .join(trigger_logic === "AND" ? " and " : " or ");
                            const dest = (team: string) =>
                                team === pick.original_team ? `${cityFor(team)} keeps it` : `it goes to ${cityFor(team)}`;
                            return `The ${teamMeta.city} ${pick.year} ${roundStr} pick has no protection of its own — its destination depends entirely on another pick's result. If ${trigDesc}, ${dest(if_triggered_to)}; otherwise ${dest(if_not_triggered_to)}.`;
                        }

                        if (!isProtectedSwap || !rawPick) return typeInfo.description;

                        const roundStr  = pick.round === 1 ? "1st-round" : "2nd-round";
                        const yr        = String(pick.year);
                        const teamCities = poolPicks.map(p => cityFor(p.original_team));
                        const poolStr   = teamCities.length <= 2
                            ? teamCities.join(" and ")
                            : `${teamCities.slice(0, -1).join(", ")}, and ${teamCities[teamCities.length - 1]}`;

                        const rank1Alloc = allocation.find((a: any) => Number(a.rank) === 1);
                        const rank1City  = rank1Alloc?.to ? cityFor(rank1Alloc.to) : (teamCities[0] ?? "");

                        // Type 1: conditional pool entry
                        const condEntry = (rawPick.rules?.pool ?? []).find(
                            (e: any) => typeof e === "object" && e.pick && e.condition?.range
                        );
                        if (condEntry) {
                            const [min, max]  = condEntry.condition.range as [number, number];
                            const protPick    = poolPicks.find((p: SimPickCard) => p.pick_id === condEntry.pick);
                            const protCity    = protPick ? cityFor(protPick.original_team) : condEntry.pick;
                            const ifNotCity   = condEntry.if_not_in_range_to ? cityFor(condEntry.if_not_in_range_to as string) : protCity;

                            // Describe what triggers the protection (falling OUTSIDE the range)
                            const totalSlots = pick.round === 1 ? 30 : 60;
                            const startSlot  = pick.round === 1 ? 1  : 31;
                            const lowMax = min - 1;
                            const hiMin  = max + 1;
                            const hasLow  = lowMax >= startSlot;
                            const hasHigh = hiMin <= totalSlots;
                            let protTriggerDesc: string;
                            if (hasLow && !hasHigh) {
                                protTriggerDesc = lowMax === startSlot ? `lands at pick #${startSlot}` : `lands in the top ${lowMax}`;
                            } else if (!hasLow && hasHigh) {
                                protTriggerDesc = `lands in picks ${hiMin}–${totalSlots}`;
                            } else {
                                protTriggerDesc = `lands outside picks ${min}–${max}`;
                            }

                            let fallbackStr = "";
                            const fp = condEntry.fallback_pick;
                            if (fp && fp !== "none") {
                                const fi = parsePickId(fp as string);
                                if (fi) {
                                    fallbackStr = ` and sends their ${fi.year} ${fi.round === 1 ? "1st" : "2nd"}-round pick as a fallback`;
                                }
                            }

                            // Lead sentence: spell out the full allocation when the worst pick
                            // goes to a different team than the swap holder (e.g. triple swaps
                            // where the holder takes the two best and a third team gets the rest).
                            const allocSorted = [...allocation].sort((a, b) => Number(a.rank) - Number(b.rank));
                            const lastTo = allocSorted[allocSorted.length - 1]?.to;
                            const lead = allocSorted.length === 3
                                && allocSorted[0]?.to && allocSorted[0].to === allocSorted[1]?.to
                                && lastTo && lastTo !== allocSorted[0].to
                                ? `${cityFor(allocSorted[0].to)} takes the two best of the ${yr} ${roundStr} picks of ${poolStr}, while the worst goes to ${cityFor(lastTo)}.`
                                : `${rank1City} holds a swap right over the ${yr} ${roundStr} picks of ${poolStr}.`;
                            return `${lead} The ${protCity} pick only enters the swap if it falls in picks ${min}–${max}. If it ${protTriggerDesc}, ${ifNotCity} keeps it${fallbackStr}.`;
                        }

                        // Type 2: conditional allocation
                        const condAlloc = (rawPick.rules?.allocation ?? []).find(
                            (a: any) => a.if_in_range_to || a.if_not_in_range_to
                        );
                        if (condAlloc) {
                            const [min, max] = condAlloc.condition?.range ?? [1, 30];
                            const ifInCity   = condAlloc.if_in_range_to   ? cityFor(condAlloc.if_in_range_to   as string) : null;
                            const ifNotCity  = condAlloc.if_not_in_range_to ? cityFor(condAlloc.if_not_in_range_to as string) : null;
                            const rank2Sent  = ifInCity && ifNotCity
                                ? `The worse pick goes to ${ifInCity} if it falls in picks ${min}–${max}, otherwise to ${ifNotCity}.`
                                : `The destination of the worse pick depends on draft position.`;
                            return `${rank1City} takes the better of the ${yr} ${roundStr} picks of ${poolStr}. ${rank2Sent}`;
                        }

                        return typeInfo.description;
                    })();

                    return (
                        <div key={pick.pick_id} className="space-y-4">

                            {/* ── HEADER ── */}
                            {isSwapGroup ? (
                                /* Swap group: standard single-pick identity (the staged
                                   mechanics live in the body so it's clear which pick
                                   this page is about). */
                                <div className="glass-surface rounded-2xl border-2 px-6 py-5 flex items-center gap-6"
                                    style={{ borderColor: color }}>
                                    <TeamLogo abbr={teamAbbr} size={80} />
                                    <div className="space-y-1.5">
                                        <div className="text-[11px] uppercase tracking-widest opacity-40">
                                            {yearNum} · {roundLabel(roundNum)}
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-bold">{teamMeta.full}</h1>
                                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border"
                                            style={{ color: typeInfo.borderColor, borderColor: typeInfo.borderColor + "60" }}>
                                            7-Team Swap
                                        </span>
                                    </div>
                                </div>
                            ) : (isSwap || isSpecialPoolSwap) && poolSize > 1 ? (
                                /* Swap header: identity + pool */
                                <div className="space-y-3">
                                    {/* Pick identity */}
                                    <div className="glass-surface rounded-2xl border-2 px-6 py-5 flex items-center gap-6"
                                        style={{ borderColor: color }}>
                                        <TeamLogo abbr={teamAbbr} size={80} />
                                        <div className="space-y-1.5">
                                            <div className="text-[11px] uppercase tracking-widest opacity-40">
                                                {yearNum} · {roundLabel(roundNum)}
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-bold">{teamMeta.full}</h1>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border"
                                                    style={{ color: typeInfo.borderColor, borderColor: typeInfo.borderColor + "60" }}>
                                                    {typeInfo.tag}
                                                </span>
                                                {protectedPickRanges.has(pick.pick_id) && (() => {
                                                    const range = protectedPickRanges.get(pick.pick_id)!;
                                                    return (
                                                        <span className="text-[10px] opacity-50 flex items-center gap-1">
                                                            🔒 <span className="font-mono">{range[0]}–{range[1]}</span>
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Swap pool */}
                                    <div className="glass-surface rounded-2xl border-2 px-6 py-6 flex flex-col items-center gap-4 text-center"
                                        style={{ borderColor: typeInfo.borderColor + "99" }}>
                                        <h2 className="text-lg font-bold tracking-wide">Swap Pool</h2>
                                        <div className="flex items-center justify-center gap-5 flex-wrap">
                                            {poolPicks.flatMap((poolPick, i) => {
                                                const abbr = abbrFor(poolPick.original_team);
                                                const protRange = protectedPickRanges.get(poolPick.pick_id);
                                                const isProtected = protRange !== undefined;
                                                const teamEl = (
                                                    <a key={poolPick.pick_id} href={`/picks/${poolPick.year}/${poolPick.round}/${abbr.toLowerCase()}`} className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
                                                        <div className="relative">
                                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                                                                R{poolPick.round}
                                                            </div>
                                                            <TeamLogo abbr={abbr} size={64} noLink />
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E6B85C] border border-black shadow-lg text-[11px] font-black text-black leading-none whitespace-nowrap">
                                                                {poolPick.year}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <span className="text-xs font-bold opacity-60 tracking-wider">{abbr}</span>
                                                            {isProtected && (
                                                                <>
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-50 shrink-0">
                                                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                                                    </svg>
                                                                    <span className="text-[10px] opacity-40 font-mono">({protRange![0]}–{protRange![1]})</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </a>
                                                );
                                                return i === 0
                                                    ? [teamEl]
                                                    : [<span key={`sep-${i}`} className="text-white/30 text-2xl font-thin">×</span>, teamEl];
                                            })}
                                        </div>
                                        {swapId && (
                                            <div className="text-[10px] font-mono opacity-20">{swapId}</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Standard single-pick header */
                                <div className="glass-surface rounded-2xl border-2 px-6 py-5 flex items-center gap-6"
                                    style={{ borderColor: color }}>
                                    <TeamLogo abbr={teamAbbr} size={80} />
                                    <div className="space-y-1">
                                        <div className="text-[11px] uppercase tracking-widest opacity-40">
                                            {yearNum} · {roundLabel(roundNum)}
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-bold">{teamMeta.full}</h1>
                                        <div className="text-sm opacity-50">
                                            {rawPickType === "pro_pick"
                                                ? `Determined by ${teamMeta.city}'s draft result`
                                                : isProBackup
                                                    ? `Determined by a trigger and ${teamMeta.city}'s draft result`
                                                    : isBackup
                                                        ? `Determined by another pick's result`
                                                        : `${teamMeta.city} original pick`}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── FROZEN BANNER ── */}
                            {pick.frozen && (
                                <div className="glass-card rounded-xl px-4 py-2.5 border border-cyan-400/40 flex items-center gap-2 text-cyan-300 text-sm font-semibold tracking-wide">
                                    🧊 This pick is currently frozen
                                </div>
                            )}

                            {/* ── OVERVIEW ── */}
                            <div className="glass-surface rounded-xl border p-5 space-y-2"
                                style={{ borderColor: typeInfo.borderColor + "60" }}>
                                <h2 className="text-lg font-bold tracking-wide">Overview</h2>
                                <p className="text-sm opacity-70 leading-relaxed">{pickDescription}</p>
                            </div>

                            {/* ── METRICS ROW ── */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">
                                        {rawPickType === "pro_pick" ? "Protected EV" : "Stash Value"}
                                    </span>
                                    <span className={`text-3xl font-black rounded-lg px-3 py-1 ${bg} ${text} ${glow}`}>
                                        {pick.ev.toFixed(1)}
                                    </span>
                                    {rawPickType === "pro_pick" && (
                                        <span className="text-[9px] opacity-30 tracking-wide">if kept</span>
                                    )}
                                </div>
                                <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Proj. Slot</span>
                                    <span className="text-3xl font-black">{pick.expected_slot.toFixed(1)}</span>
                                    {pick.slot_probs && (() => {
                                        const slots = Object.keys(pick.slot_probs).map(Number);
                                        const min = Math.min(...slots);
                                        const max = Math.max(...slots);
                                        return (
                                            <span className="text-sm font-bold opacity-50">
                                                {min}–{max}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="glass-surface rounded-xl border p-4 flex flex-col items-center justify-center gap-2 text-center"
                                    style={{ borderColor: typeInfo.borderColor }}>
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Pick Type</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider leading-tight"
                                        style={{ color: typeInfo.borderColor }}>
                                        {typeInfo.tag}
                                    </span>
                                    {proRange && (
                                        <span className="text-sm font-black tabular-nums" style={{ color: typeInfo.borderColor }}>
                                            {proRange[0]}–{proRange[1]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── SWAP POOL (card grid) ── */}
                            {isSwap && !isSpecialPoolSwap && !isNestedSwap && poolSize > 0 && (
                                <div className="glass-card rounded-2xl p-6 space-y-5">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-lg font-bold tracking-wide">Allocations</h2>
                                        <p className="text-xs opacity-40">
                                            Draft position determines who gets what — the best pick goes to the top-ranked recipient.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 max-md:grid-cols-2!" style={{ gridTemplateColumns: `repeat(${poolSize}, minmax(0, 1fr))` }}>
                                        {sortedPool.map((poolPick) => {
                                            const pAbbr     = abbrFor(poolPick.original_team);
                                            const pos       = poolPosition(poolPick);
                                            const posColor  = SWAP_POS_COLOR[pos];
                                            const recipient = recipientFor(poolPick);
                                            const recAbbr   = recipient ? abbrFor(recipient) : null;
                                            const recColor  = readableTextColor(recAbbr ? (teamColors[recAbbr] ?? "#444") : "#444");
                                            const recProb   = recipientProb(poolPick);
                                            const { bg: pbg, text: ptxt } = evStyles(poolPick.ev, poolPick.round);
                                            const isCurrent = poolPick.pick_id === pick.pick_id;

                                            return (
                                                <a
                                                    key={poolPick.pick_id}
                                                    href={`/picks/${poolPick.year}/${poolPick.round}/${pAbbr.toLowerCase()}`}
                                                    className={`rounded-2xl border flex flex-col items-center gap-4 p-5 text-center transition-colors ${
                                                        isCurrent
                                                            ? "border-white/30 bg-white/6"
                                                            : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
                                                    }`}
                                                >
                                                    {/* SWAP POSITION */}
                                                    <div className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border"
                                                        style={{ color: posColor, borderColor: posColor + "70", background: posColor + "18" }}>
                                                        {pos}
                                                    </div>

                                                    {/* "to" connector */}
                                                    <div className="text-[10px] opacity-40 -my-2">TO</div>

                                                    {/* RECIPIENT — the team that owns/receives this pick */}
                                                    {recAbbr ? (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <TeamLogo abbr={recAbbr} size={64} noLink />
                                                            <span className="text-sm font-bold" style={{ color: recColor }}>
                                                                {TEAM_METADATA[recAbbr]?.city ?? recipient}
                                                            </span>
                                                            {recProb ? (
                                                                <span className="text-[10px] opacity-40">{Math.round(recProb * 100)}% likely owner</span>
                                                            ) : (
                                                                <span className="text-[10px] opacity-40">{recAbbr}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[11px] opacity-30 italic">Recipient TBD</div>
                                                    )}

                                                    {/* DIVIDER */}
                                                    <div className="w-full border-t border-white/10" />

                                                    {/* SOURCE PICK — EV + slot only */}
                                                    <div className="flex flex-col items-center gap-2 w-full">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className={`rounded-lg px-3 py-1.5 text-center ${pbg} ${ptxt}`}>
                                                                <div className="text-[9px] font-black opacity-70 leading-none uppercase">EV</div>
                                                                <div className="text-sm font-black leading-none mt-0.5">{poolPick.ev.toFixed(1)}</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-[9px] opacity-40 uppercase leading-none">Slot</div>
                                                                <div className="text-sm font-black mt-0.5">{poolPick.expected_slot.toFixed(0)}</div>
                                                            </div>
                                                        </div>
                                                        {isCurrent && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded border border-white/25 text-white/60 tracking-wider">
                                                                THIS PICK
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* POOL ENTRY CONDITION (protected swaps) */}
                                                    {isProtectedSwap && (() => {
                                                        const entry = poolEntryMap.get(poolPick.pick_id);
                                                        const poolRange: [number, number] | null =
                                                            (entry && typeof entry === "object") ? (entry.condition?.range ?? null) : null;
                                                        const allocRange = allocCondMap.get(poolPick.pick_id) ?? null;
                                                        const range = poolRange ?? allocRange;
                                                        const label = allocRange && !poolRange ? "Destination" : "Pool Entry";
                                                        return (
                                                            <>
                                                                <div className="w-full border-t border-white/8" />
                                                                <div className="text-center">
                                                                    <div className="text-[9px] font-black uppercase tracking-wider opacity-30">{label}</div>
                                                                    {range ? (
                                                                        <div className="text-[10px] font-semibold opacity-60 mt-0.5">picks {range[0]}–{range[1]}</div>
                                                                    ) : (
                                                                        <div className="text-[10px] opacity-30 mt-0.5">always</div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── SPECIAL POOL SWAP (conditional allocation) ── */}
                            {isSpecialPoolSwap && (() => {
                                const rank1Alloc = (rawPick?.rules?.allocation ?? []).find((a: any) => Number(a.rank) === 1);
                                const rank2Alloc = (rawPick?.rules?.allocation ?? []).find((a: any) => a.if_in_range_to || a.if_not_in_range_to);

                                const betterPick = sortedPool[0];
                                const worsePick  = sortedPool[1];
                                if (!betterPick || !worsePick || !rank2Alloc) return null;

                                const betterAbbr = abbrFor(betterPick.original_team);
                                const worseAbbr  = abbrFor(worsePick.original_team);
                                const { bg: betterBg, text: betterTxt } = evStyles(betterPick.ev, betterPick.round);
                                const { bg: worseBg,  text: worseTxt  } = evStyles(worsePick.ev,  worsePick.round);

                                const rank1RecipientCity = rank1Alloc?.to ? cityFor(rank1Alloc.to) : "?";
                                const rank1RecipientAbbr = rank1Alloc?.to ? abbrFor(rank1Alloc.to) : null;
                                const rank1Color = readableTextColor(rank1RecipientAbbr ? (teamColors[rank1RecipientAbbr] ?? "#444") : "#444");

                                const condRange: [number, number] = rank2Alloc.condition?.range ?? [1, 30];
                                const ifInCity  = rank2Alloc.if_in_range_to   ? cityFor(rank2Alloc.if_in_range_to)   : null;
                                const ifInAbbr  = rank2Alloc.if_in_range_to   ? abbrFor(rank2Alloc.if_in_range_to)   : null;
                                const ifNotCity = rank2Alloc.if_not_in_range_to ? cityFor(rank2Alloc.if_not_in_range_to) : null;
                                const ifNotAbbr = rank2Alloc.if_not_in_range_to ? abbrFor(rank2Alloc.if_not_in_range_to) : null;
                                const ifInColor  = readableTextColor(ifInAbbr  ? (teamColors[ifInAbbr]  ?? "#444") : "#444");
                                const ifNotColor = readableTextColor(ifNotAbbr ? (teamColors[ifNotAbbr] ?? "#444") : "#444");

                                const probIn    = triggerProb(worsePick, rank2Alloc.condition);
                                const probNotIn = probIn !== null ? 1 - probIn : null;

                                const isCurBetter = betterPick.pick_id === pick.pick_id;
                                const isCurWorse  = worsePick.pick_id  === pick.pick_id;

                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-5">
                                        <div className="text-center space-y-1">
                                            <h2 className="text-lg font-bold tracking-wide">Swap Allocation</h2>
                                            <p className="text-xs opacity-40">
                                                Both picks always enter the pool. The better pick always goes to {rank1RecipientCity}. The worse pick's destination depends on where it lands.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Better pick */}
                                            <div className={`rounded-2xl border p-5 space-y-3 flex flex-col items-center text-center ${isCurBetter ? "border-white/30 bg-white/6" : "border-green-500/20 bg-green-500/5"}`}>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-green-400 opacity-80">Better Pick</div>
                                                <TeamLogo abbr={betterAbbr} size={48} />
                                                <div>
                                                    <div className="text-xs font-bold opacity-70">{pickLabel(betterPick.pick_id)}</div>
                                                    {isCurBetter && <div className="text-[9px] font-black px-2 py-0.5 rounded border border-white/25 text-white/60 tracking-wider mt-1 inline-block">THIS PICK</div>}
                                                </div>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className={`rounded-lg px-3 py-1.5 text-center ${betterBg} ${betterTxt}`}>
                                                        <div className="text-[9px] font-black opacity-70 uppercase leading-none">EV</div>
                                                        <div className="text-sm font-black leading-none mt-0.5">{betterPick.ev.toFixed(1)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] opacity-40 uppercase leading-none">Slot</div>
                                                        <div className="text-sm font-black mt-0.5">{betterPick.expected_slot.toFixed(0)}</div>
                                                    </div>
                                                </div>
                                                <div className="w-full border-t border-white/10" />
                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-30">Always goes to</div>
                                                {rank1RecipientAbbr && (
                                                    <div className="flex items-center gap-1.5">
                                                        <TeamLogo abbr={rank1RecipientAbbr} size={18} />
                                                        <span className="text-xs font-bold" style={{ color: rank1Color }}>{rank1RecipientCity}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Worse pick */}
                                            <div className={`rounded-2xl border p-5 space-y-3 flex flex-col items-center text-center ${isCurWorse ? "border-white/30 bg-white/6" : "border-amber-500/20 bg-amber-500/5"}`}>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 opacity-80">Worse Pick</div>
                                                <TeamLogo abbr={worseAbbr} size={48} />
                                                <div>
                                                    <div className="text-xs font-bold opacity-70">{pickLabel(worsePick.pick_id)}</div>
                                                    {isCurWorse && <div className="text-[9px] font-black px-2 py-0.5 rounded border border-white/25 text-white/60 tracking-wider mt-1 inline-block">THIS PICK</div>}
                                                </div>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className={`rounded-lg px-3 py-1.5 text-center ${worseBg} ${worseTxt}`}>
                                                        <div className="text-[9px] font-black opacity-70 uppercase leading-none">EV</div>
                                                        <div className="text-sm font-black leading-none mt-0.5">{worsePick.ev.toFixed(1)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] opacity-40 uppercase leading-none">Slot</div>
                                                        <div className="text-sm font-black mt-0.5">{worsePick.expected_slot.toFixed(0)}</div>
                                                    </div>
                                                </div>
                                                <div className="w-full border-t border-white/10" />
                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-30">Conditional destination</div>
                                                <div className="grid grid-cols-2 gap-2 w-full">
                                                    {ifNotAbbr && (
                                                        <div className="rounded-xl border border-white/10 bg-white/3 p-2 space-y-1">
                                                            <div className="text-[8px] font-black opacity-30 uppercase">Top {condRange[0] - 1}</div>
                                                            <TeamLogo abbr={ifNotAbbr} size={18} />
                                                            <div className="text-[10px] font-semibold" style={{ color: ifNotColor }}>{ifNotCity}</div>
                                                            {probNotIn !== null && <div className="text-sm font-black opacity-70">{(probNotIn * 100).toFixed(1)}%</div>}
                                                        </div>
                                                    )}
                                                    {ifInAbbr && (
                                                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2 space-y-1">
                                                            <div className="text-[8px] font-black opacity-50 text-amber-400 uppercase">{condRange[0]}–{condRange[1]}</div>
                                                            <TeamLogo abbr={ifInAbbr} size={18} />
                                                            <div className="text-[10px] font-semibold" style={{ color: ifInColor }}>{ifInCity}</div>
                                                            {probIn !== null && <div className="text-sm font-black text-amber-300">{(probIn * 100).toFixed(1)}%</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── SWAP GROUP (7-team, two-tier) ── */}
                            {isSwapGroup && (() => {
                                const curOwners = [...pick.ownership]
                                    .filter(o => o.prob >= 0.005)
                                    .sort((a, b) => b.prob - a.prob);
                                const STAGE_TEAMS: Record<string, string[]> = {
                                    main: ["BKN", "PHI", "PHX", "NYK"],
                                    split: ["WAS", "PHX"],
                                    sec: ["MIL", "POR", "WAS"],
                                };
                                const teamRow = (keys: string[]) => (
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        {keys.map(k => (
                                            <div key={k} className="flex flex-col items-center gap-1">
                                                <TeamLogo abbr={k} size={34} />
                                                <span className="text-[9px] font-bold opacity-50 tracking-wider">{k}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                                const stage = (n: string, title: string, keys: string[], rules: string[]) => (
                                    <div className="rounded-2xl border border-white/10 bg-white/2 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">{n}</span>
                                            <span className="text-sm font-bold tracking-wide">{title}</span>
                                        </div>
                                        {teamRow(keys)}
                                        <ul className="space-y-1.5">
                                            {rules.map((r, i) => (
                                                <li key={i} className="flex gap-2 text-xs opacity-70 leading-relaxed">
                                                    <span className="opacity-40 shrink-0">•</span>
                                                    <span>{r}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                                return (
                                    <>
                                        {/* WHERE THIS PICK LANDS */}
                                        <div className="glass-card rounded-2xl p-6 space-y-4">
                                            <div>
                                                <h2 className="text-lg font-bold tracking-wide">Where this pick lands</h2>
                                                <p className="text-xs opacity-40 mt-1">
                                                    How often the {teamMeta.city} pick conveys to each team, with its average value when it does.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                {curOwners.map((o, i) => {
                                                    const oAbbr  = abbrFor(o.team);
                                                    const oColor = teamColors[oAbbr] ?? "#555";
                                                    const pct    = o.prob >= 1 ? 99.9 : Math.round(o.prob * 100);
                                                    const keeps  = o.team === pick.original_team;
                                                    return (
                                                        <div key={o.team} className="flex items-center gap-4">
                                                            <span className="text-xs opacity-30 w-4 text-right shrink-0">{i + 1}</span>
                                                            <TeamLogo abbr={oAbbr} size={36} />
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-semibold truncate">
                                                                        {TEAM_METADATA[oAbbr]?.full ?? o.team}
                                                                        {keeps && <span className="opacity-40 font-normal"> (keeps it)</span>}
                                                                    </span>
                                                                    <span className="text-xs font-black opacity-70 shrink-0 ml-2">{pct}%</span>
                                                                </div>
                                                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                                    <div className="h-full rounded-full"
                                                                        style={{ width: `${pct}%`, backgroundColor: oColor, boxShadow: `0 0 6px ${oColor}80` }} />
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <div className="text-[10px] opacity-40 uppercase">EV if won</div>
                                                                <div className="text-sm font-black">{o.conditional_ev.toFixed(1)}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* HOW THE SWAP RESOLVES */}
                                        <div className="glass-card rounded-2xl p-6 space-y-4">
                                            <div className="text-center space-y-1">
                                                <h2 className="text-lg font-bold tracking-wide">How the swap resolves</h2>
                                                <p className="text-xs opacity-40 max-w-md mx-auto">
                                                    Settled in stages by draft position — a lower pick number is more favorable. The leftover from each stage feeds the next.
                                                </p>
                                            </div>
                                            {stage("1", "Main Pool", STAGE_TEAMS.main, [
                                                "Philadelphia's pick is protected 1–8 — it only joins the pool if it lands 9–30.",
                                                "Brooklyn takes the two most favorable picks in the pool.",
                                                "New York takes the least favorable of the New York, Brooklyn, and Phoenix picks.",
                                                "The one pick still unassigned carries over to Stage 2.",
                                            ])}
                                            {stage("2", "Washington / Phoenix", STAGE_TEAMS.split, [
                                                "Washington takes the more favorable of its own pick and the Stage 1 carryover.",
                                                "Phoenix takes the less favorable of those two.",
                                            ])}
                                            {stage("3", "Secondary Swap", STAGE_TEAMS.sec, [
                                                "Portland takes the more favorable of the Portland and Milwaukee picks.",
                                                "Washington keeps the better of its Stage 2 pick and the less favorable of Milwaukee/Portland.",
                                                "Milwaukee receives whatever is left.",
                                            ])}
                                        </div>

                                        {/* PICK ALLOCATIONS — every pick, sorted by value, → most-likely owner */}
                                        <div className="glass-card rounded-2xl p-6 space-y-4">
                                            <div className="text-center space-y-1">
                                                <h2 className="text-lg font-bold tracking-wide">Pick allocations</h2>
                                                <p className="text-xs opacity-40">
                                                    All seven picks, ranked by value, and where each most often lands.
                                                </p>
                                            </div>
                                            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
                                                {[...sgMainPicks, ...sgSecPicks]
                                                    .sort((a, b) => b.ev - a.ev)
                                                    .map(p => {
                                                        const pAbbr = abbrFor(p.original_team);
                                                        const isCur = p.pick_id === pick.pick_id;
                                                        const top   = [...p.ownership].sort((a, b) => b.prob - a.prob)[0];
                                                        const topAbbr = top ? abbrFor(top.team) : null;
                                                        const { bg: pbg, text: ptxt } = evStyles(p.ev, p.round);
                                                        return (
                                                            <a key={p.pick_id}
                                                                href={`/picks/${p.year}/${p.round}/${pAbbr.toLowerCase()}`}
                                                                className={`rounded-2xl border flex flex-col items-center gap-2 p-3 text-center transition-colors ${
                                                                    isCur ? "border-white/30 bg-white/6" : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
                                                                }`}
                                                            >
                                                                {/* source pick */}
                                                                <TeamLogo abbr={pAbbr} size={32} noLink />
                                                                <span className="text-[10px] font-bold opacity-60 tracking-wider">{pAbbr}</span>
                                                                {/* value */}
                                                                <div className={`rounded-md px-2 py-1 ${pbg} ${ptxt}`}>
                                                                    <div className="text-[7px] font-black opacity-70 uppercase leading-none">Value</div>
                                                                    <div className="text-sm font-black leading-none mt-0.5">{p.ev.toFixed(1)}</div>
                                                                </div>
                                                                {/* arrow */}
                                                                <div className="text-white/25 text-xs leading-none">↓</div>
                                                                {/* destination */}
                                                                {topAbbr ? (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <TeamLogo abbr={topAbbr} size={28} noLink />
                                                                        <span className="text-[10px] font-semibold opacity-80 leading-tight">
                                                                            {TEAM_METADATA[topAbbr]?.city ?? top.team}
                                                                        </span>
                                                                        <span className="text-[9px] opacity-40 leading-none">{Math.round(top.prob * 100)}%</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] opacity-30 italic">TBD</span>
                                                                )}
                                                                {isCur && (
                                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-white/25 text-white/60 tracking-wider leading-none">
                                                                        THIS PICK
                                                                    </span>
                                                                )}
                                                            </a>
                                                        );
                                                    })}
                                            </div>
                                        </div>

                                        {/* ALL PICKS IN THE GROUP */}
                                        <div className="glass-card rounded-2xl p-6 space-y-3">
                                            <h2 className="text-lg font-bold tracking-wide">All picks in this swap</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {[...sgMainPicks, ...sgSecPicks].map(p => {
                                                    const pAbbr = abbrFor(p.original_team);
                                                    const isCur = p.pick_id === pick.pick_id;
                                                    const top   = [...p.ownership].sort((a, b) => b.prob - a.prob)[0];
                                                    const topAbbr = top ? abbrFor(top.team) : null;
                                                    return (
                                                        <a key={p.pick_id}
                                                            href={`/picks/${p.year}/${p.round}/${pAbbr.toLowerCase()}`}
                                                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                                                                isCur ? "border-white/30 bg-white/6" : "border-white/8 bg-white/2 hover:border-white/20"
                                                            }`}
                                                        >
                                                            <TeamLogo abbr={pAbbr} size={28} noLink />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold">{pAbbr}{isCur && <span className="opacity-50 font-normal"> · this pick</span>}</div>
                                                                {topAbbr && (
                                                                    <div className="text-[10px] opacity-40">
                                                                        usually &rarr; {TEAM_METADATA[topAbbr]?.city ?? top.team} ({Math.round(top.prob * 100)}%)
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {topAbbr && <TeamLogo abbr={topAbbr} size={20} noLink />}
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            {/* ── NESTED SWAP (multi-level) ── */}
                            {isNestedSwap && (() => {
                                const levels: any[] = rawPick?.rules?.levels ?? [];
                                if (!levels.length) return null;

                                // Build TEMP → SimPickCard: for each level, find which real pick maps to a TEMP output
                                const tempPickMap = new Map<string, SimPickCard>();
                                for (const lvl of levels) {
                                    const lvlRealIds: string[] = (lvl.pool ?? [])
                                        .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                                        .filter((id: string | null) => id && !id.startsWith("TEMP_"));
                                    const lvlSorted = lvlRealIds
                                        .map((id: string) => pickIdMap.get(id))
                                        .filter(Boolean)
                                        .sort((a: any, b: any) => b.ev - a.ev) as SimPickCard[];
                                    for (const a of (lvl.allocation ?? [])) {
                                        if (a.to?.startsWith("TEMP_")) {
                                            const p = lvlSorted[Number(a.rank) - 1];
                                            if (p) tempPickMap.set(a.to, p);
                                        }
                                    }
                                }

                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-6">
                                        <div className="text-center space-y-1">
                                            <h2 className="text-lg font-bold tracking-wide">Nested Swap</h2>
                                            <p className="text-xs opacity-40 max-w-md mx-auto">
                                                Resolved in {levels.length} stages — the output of each sub-swap feeds into the next.
                                            </p>
                                        </div>

                                        {levels.map((level: any, lvlIdx: number) => {
                                            const levelPoolRaw: any[] = level.pool ?? [];
                                            const realIds: string[] = levelPoolRaw
                                                .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                                                .filter((id: string | null) => id && !id.startsWith("TEMP_"));
                                            const tempIds: string[] = levelPoolRaw
                                                .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                                                .filter((id: string | null) => id?.startsWith("TEMP_"));
                                            const realPicks = realIds
                                                .map((id: string) => pickIdMap.get(id))
                                                .filter(Boolean) as SimPickCard[];
                                            const sortedReal = [...realPicks].sort((a, b) => b.ev - a.ev);
                                            const alloc: any[] = level.allocation ?? [];
                                            const totalInPool = sortedReal.length + tempIds.length;

                                            // For levels with TEMP inputs: determine TEMP's expected rank
                                            // by treating it as "worse than real picks" (it's LF from prior stage)
                                            // We assume TEMP always ranks last among real picks for display purposes
                                            const tempRankStart = sortedReal.length;

                                            return (
                                                <div key={lvlIdx} className="space-y-3">
                                                    {/* ── POOL HEADER: title + the picks that compete in this sub-swap ── */}
                                                    <div className="space-y-2 pt-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 border-t border-white/8" />
                                                            <span className="text-sm font-black uppercase tracking-[0.2em] text-white/80 whitespace-nowrap">
                                                                Swap Pool {lvlIdx + 1}
                                                            </span>
                                                            <div className="flex-1 border-t border-white/8" />
                                                        </div>
                                                        <div className="flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap">
                                                            {realPicks.map((p) => {
                                                                const a = abbrFor(p.original_team);
                                                                return (
                                                                    <div key={p.pick_id} className="flex items-center gap-1.5">
                                                                        <TeamLogo abbr={a} size={18} />
                                                                        <span className="text-[11px] font-bold opacity-60">{a}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {tempIds.map((tempId: string) => (
                                                                <div key={tempId} className="flex items-center gap-1.5 opacity-50">
                                                                    <div className="w-[18px] h-[18px] rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                                                                        <span className="text-white/40 text-[10px] font-thin">↑</span>
                                                                    </div>
                                                                    <span className="text-[11px] font-bold italic">Stage {lvlIdx} loser</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-2 max-md:grid-cols-2!" style={{ gridTemplateColumns: `repeat(${totalInPool}, minmax(0, 1fr))` }}>
                                                        {/* Real picks — sorted best→worst */}
                                                        {sortedReal.map((p, rankIdx) => {
                                                            const pAbbr = abbrFor(p.original_team);
                                                            const isCur = p.pick_id === pick.pick_id;
                                                            const { bg: pbg, text: ptxt } = evStyles(p.ev, p.round);
                                                            const allocEntry = alloc.find((a: any) => Number(a.rank) === rankIdx + 1);
                                                            const recipientName = allocEntry?.to as string | null;
                                                            const isTemp = recipientName?.startsWith("TEMP_");
                                                            const recipientAbbr = (!isTemp && recipientName) ? abbrFor(recipientName) : null;
                                                            const pos = rankIdx === 0 ? "SWAP BEST" : rankIdx === totalInPool - 1 ? "SWAP WORST" : "SWAP MID";
                                                            const posColor = SWAP_POS_COLOR[pos];
                                                            const displayAbbr = recipientAbbr ?? pAbbr;

                                                            return (
                                                                <a
                                                                    key={p.pick_id}
                                                                    href={`/picks/${p.year}/${p.round}/${pAbbr.toLowerCase()}`}
                                                                    className={`rounded-2xl border flex flex-col items-center gap-2 p-3 text-center transition-colors ${
                                                                        isCur
                                                                            ? "border-white/30 bg-white/6"
                                                                            : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
                                                                    }`}
                                                                >
                                                                    <div className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border"
                                                                        style={{ color: posColor, borderColor: posColor + "70", background: posColor + "18" }}>
                                                                        {pos}
                                                                    </div>
                                                                    {isTemp ? (
                                                                        <div className="w-8 h-8 flex items-center justify-center">
                                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
                                                                                <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/>
                                                                            </svg>
                                                                        </div>
                                                                    ) : (
                                                                        <TeamLogo abbr={displayAbbr} size={32} noLink />
                                                                    )}
                                                                    <span className="text-[10px] font-bold opacity-70">
                                                                        {isTemp
                                                                            ? <span className="opacity-50 italic">stage {lvlIdx + 2}</span>
                                                                            : (recipientAbbr ? (TEAM_METADATA[recipientAbbr]?.city ?? recipientAbbr) : pAbbr)
                                                                        }
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className={`rounded px-1.5 py-1 ${pbg} ${ptxt}`}>
                                                                            <div className="text-[7px] font-black opacity-70 uppercase leading-none">EV</div>
                                                                            <div className="text-[10px] font-black leading-none mt-0.5">{p.ev.toFixed(1)}</div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-[7px] opacity-40 uppercase leading-none">Slot</div>
                                                                            <div className="text-[10px] font-black mt-0.5">{p.expected_slot.toFixed(0)}</div>
                                                                        </div>
                                                                    </div>
                                                                    {isCur && (
                                                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-white/25 text-white/60 tracking-wider leading-none">
                                                                            THIS PICK
                                                                        </span>
                                                                    )}
                                                                </a>
                                                            );
                                                        })}

                                                        {/* TEMP carry-over cards */}
                                                        {tempIds.map((tempId: string, tIdx: number) => {
                                                            const tempRank = tempRankStart + tIdx + 1;
                                                            const allocEntry = alloc.find((a: any) => Number(a.rank) === tempRank);
                                                            const allocTo = allocEntry?.to as string | null;
                                                            const isAllocTemp = allocTo?.startsWith("TEMP_");
                                                            const allocAbbr = (allocTo && !isAllocTemp) ? abbrFor(allocTo) : null;
                                                            const pos = tempRank === 1 ? "SWAP BEST" : tempRank === totalInPool ? "SWAP WORST" : "SWAP MID";
                                                            const posColor = SWAP_POS_COLOR[pos];
                                                            const tempSourcePick = tempPickMap.get(tempId);
                                                            const { bg: tpbg, text: tptxt } = tempSourcePick ? evStyles(tempSourcePick.ev, tempSourcePick.round) : { bg: "", text: "" };

                                                            return (
                                                                <div key={tempId} className="rounded-2xl border border-white/8 bg-white/2 flex flex-col items-center gap-2 p-3 text-center opacity-70">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border"
                                                                        style={{ color: posColor, borderColor: posColor + "70", background: posColor + "18" }}>
                                                                        {pos}
                                                                    </div>
                                                                    {allocAbbr ? (
                                                                        <>
                                                                            <TeamLogo abbr={allocAbbr} size={32} />
                                                                            <div className="flex flex-col items-center gap-0.5">
                                                                                <span className="text-[10px] font-bold opacity-70">
                                                                                    {TEAM_METADATA[allocAbbr]?.city ?? allocAbbr}
                                                                                </span>
                                                                                <span className="text-[8px] opacity-30">Stage {lvlIdx} worst</span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="w-8 h-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                                                                                <span className="text-white/30 text-lg font-thin">↑</span>
                                                                            </div>
                                                                            <div className="text-[8px] opacity-40 leading-tight text-center">
                                                                                Stage {lvlIdx} worst
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {tempSourcePick && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className={`rounded px-1.5 py-1 ${tpbg} ${tptxt}`}>
                                                                                <div className="text-[7px] font-black opacity-70 uppercase leading-none">EV</div>
                                                                                <div className="text-[10px] font-black leading-none mt-0.5">{tempSourcePick.ev.toFixed(1)}</div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-[7px] opacity-40 uppercase leading-none">Slot</div>
                                                                                <div className="text-[10px] font-black mt-0.5">{tempSourcePick.expected_slot.toFixed(0)}</div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* ── FALLBACK PICKS ── */}
                            {isProtectedSwap && !isSpecialPoolSwap && (
                                <div className="glass-card rounded-2xl p-6 space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold tracking-wide">Fallback Pick</h2>
                                        <p className="text-xs opacity-40 mt-1">
                                            Sent in place of the protected pick if it never enters the swap.
                                        </p>
                                    </div>
                                    {fallbackEntries.length > 0 ? (
                                        <div className="space-y-2">
                                            {fallbackEntries.map(({ protectedPickId, fallbackPickId }) => {
                                                const protInfo = parsePickId(protectedPickId);
                                                const fbInfo   = parsePickId(fallbackPickId);
                                                const fbPick   = pickIdMap.get(fallbackPickId);
                                                const fbAbbr   = fbInfo?.teamAbbr ?? null;
                                                const { bg: fbBg, text: fbText } = fbPick ? evStyles(fbPick.ev, fbPick.round) : { bg: "", text: "" };
                                                return (
                                                    <a
                                                        key={fallbackPickId}
                                                        href={fbInfo ? `/picks/${fbInfo.year}/${fbInfo.round}/${fbAbbr?.toLowerCase()}` : "#"}
                                                        className="glass-row flex items-center gap-4 rounded-xl px-4 py-3"
                                                    >
                                                        {fbAbbr && <TeamLogo abbr={fbAbbr} size={36} noLink />}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold">{pickLabel(fallbackPickId)}</div>
                                                            {protInfo && (
                                                                <div className="text-[10px] opacity-40 mt-0.5">
                                                                    if {protInfo.teamAbbr} pick stays home
                                                                </div>
                                                            )}
                                                        </div>
                                                        {fbPick && (
                                                            <div className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-black ${fbBg} ${fbText}`}>
                                                                {fbPick.ev.toFixed(1)}
                                                            </div>
                                                        )}
                                                        <span className="text-white/20 text-xs shrink-0">→</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm opacity-30 italic">No fallback — if protection triggers, no replacement is sent.</div>
                                    )}
                                </div>
                            )}

                            {/* ── PROTECTED SWAP PROTECTION DETAILS ── */}
                            {isProtectedSwap && !isSpecialPoolSwap && (() => {
                                // Type 1: conditional pool entry (pick has a condition on whether it enters)
                                const condPoolEntries: any[] = (rawPick?.rules?.pool ?? [])
                                    .filter((e: any) => typeof e === "object" && e.pick && e.condition?.range);

                                // Type 2: conditional allocation (swap always happens, but destination is conditional)
                                const condAllocs: any[] = (rawPick?.rules?.allocation ?? [])
                                    .filter((a: any) => a.if_in_range_to || a.if_not_in_range_to);

                                if (condPoolEntries.length === 0 && condAllocs.length === 0) return null;

                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-5">
                                        <div>
                                            <h2 className="text-lg font-bold tracking-wide">Protection Details</h2>
                                            <p className="text-xs opacity-40 mt-1">
                                                This swap has conditions — one pick may stay home instead of entering the pool.
                                            </p>
                                        </div>

                                        {condPoolEntries.map((entry: any, i: number) => {
                                            const protPickId = entry.pick as string;
                                            const condition  = entry.condition as { range: [number, number] };
                                            const [min, max] = condition.range;
                                            const ifNotInRangeTo = entry.if_not_in_range_to as string | null;
                                            const fallbackPickId = (entry.fallback_pick && entry.fallback_pick !== "none") ? entry.fallback_pick as string : null;

                                            const protPick = pickIdMap.get(protPickId);
                                            const protInfo = parsePickId(protPickId);
                                            const protAbbr = protInfo?.teamAbbr ?? null;

                                            // Prob pick falls in condition range → enters swap
                                            const enterProb = protPick ? triggerProb(protPick, condition) : null;
                                            const stayProb  = enterProb !== null ? 1 - enterProb : null;

                                            const ifNotAbbr  = ifNotInRangeTo ? abbrFor(ifNotInRangeTo) : null;
                                            const ifNotColor = ifNotAbbr ? (teamColors[ifNotAbbr] ?? "#444") : "#444";

                                            // Compute "stays home" range description (outside condition.range)
                                            const totalSlots = pick.round === 1 ? 30 : 60;
                                            const startSlot  = pick.round === 1 ? 1  : 31;
                                            const lowMin = startSlot, lowMax = min - 1;
                                            const hiMin  = max + 1,   hiMax  = totalSlots;
                                            const hasLow  = lowMax >= lowMin;
                                            const hasHigh = hiMin  <= hiMax;
                                            let protRangeDesc: string;
                                            if (hasLow && !hasHigh) {
                                                protRangeDesc = lowMax === lowMin ? `falls at pick #${lowMin}` : `falls in top ${lowMax}`;
                                            } else if (!hasLow && hasHigh) {
                                                protRangeDesc = `falls in picks ${hiMin}–${hiMax}`;
                                            } else if (hasLow && hasHigh) {
                                                protRangeDesc = `falls outside picks ${min}–${max}`;
                                            } else {
                                                protRangeDesc = "any result";
                                            }
                                            const enterRangeDesc = `falls in picks ${min}–${max}`;

                                            const fallbackInfo = fallbackPickId ? parsePickId(fallbackPickId) : null;
                                            const fallbackAbbr = fallbackInfo?.teamAbbr ?? null;

                                            return (
                                                <div key={i} className="space-y-3">
                                                    {protAbbr && (
                                                        <div className="flex items-center gap-3 px-1">
                                                            <TeamLogo abbr={protAbbr} size={28} />
                                                            <div>
                                                                <div className="text-sm font-bold">{pickLabel(protPickId)}</div>
                                                                <div className="text-[11px] opacity-40">has conditional pool entry</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Enters swap */}
                                                        <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-purple-400 opacity-80">Enters Swap</div>
                                                            <div className="text-xs opacity-60">{enterRangeDesc}</div>
                                                            {enterProb !== null && (
                                                                <div className="text-xl font-black text-purple-300">{(enterProb * 100).toFixed(1)}%</div>
                                                            )}
                                                        </div>

                                                        {/* Stays home */}
                                                        <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Stays Home</div>
                                                            <div className="text-xs opacity-60">{protRangeDesc}</div>
                                                            {ifNotAbbr && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <TeamLogo abbr={ifNotAbbr} size={16} />
                                                                    <span className="text-xs font-semibold" style={{ color: ifNotColor }}>
                                                                        {TEAM_METADATA[ifNotAbbr]?.city ?? ifNotInRangeTo}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {stayProb !== null && (
                                                                <div className="text-xl font-black opacity-60">{(stayProb * 100).toFixed(1)}%</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {fallbackPickId && (
                                                        <a
                                                            href={fallbackInfo ? `/picks/${fallbackInfo.year}/${fallbackInfo.round}/${fallbackAbbr?.toLowerCase()}` : "#"}
                                                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/8 bg-white/2 hover:border-white/16 hover:bg-white/4 transition-colors"
                                                        >
                                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Fallback</span>
                                                            {fallbackAbbr && <TeamLogo abbr={fallbackAbbr} size={16} noLink />}
                                                            <span className="text-xs opacity-50">{pickLabel(fallbackPickId)}</span>
                                                            <span className="ml-auto text-[9px] opacity-30">View →</span>
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {condAllocs.map((alloc: any, i: number) => {
                                            const condition     = alloc.condition as { range: [number, number] } | undefined;
                                            const [min, max]    = condition?.range ?? [1, 30];
                                            const ifInRangeTo   = alloc.if_in_range_to   as string | null;
                                            const ifNotInRangeTo = alloc.if_not_in_range_to as string | null;

                                            const ifInAbbr   = ifInRangeTo   ? abbrFor(ifInRangeTo)   : null;
                                            const ifNotAbbr  = ifNotInRangeTo ? abbrFor(ifNotInRangeTo) : null;
                                            const ifInColor  = ifInAbbr  ? (teamColors[ifInAbbr]  ?? "#444") : "#444";
                                            const ifNotColor = ifNotAbbr ? (teamColors[ifNotAbbr] ?? "#444") : "#444";

                                            const rankNum = Number(alloc.rank);
                                            const rankPick = sortedPool[rankNum - 1];
                                            const condProb    = rankPick ? triggerProb(rankPick, condition) : null;
                                            const notCondProb = condProb !== null ? 1 - condProb : null;

                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="text-[11px] opacity-40 px-1">
                                                        Rank {alloc.rank} pick destination is conditional
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {ifInAbbr && (
                                                            <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-40">IF PICKS {min}–{max}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <TeamLogo abbr={ifInAbbr} size={20} />
                                                                    <span className="text-xs font-semibold" style={{ color: ifInColor }}>
                                                                        {TEAM_METADATA[ifInAbbr]?.city ?? ifInRangeTo}
                                                                    </span>
                                                                </div>
                                                                {condProb !== null && (
                                                                    <div className="text-sm font-black opacity-60">{(condProb * 100).toFixed(1)}%</div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {ifNotAbbr && (
                                                            <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-40">OTHERWISE</div>
                                                                <div className="flex items-center gap-2">
                                                                    <TeamLogo abbr={ifNotAbbr} size={20} />
                                                                    <span className="text-xs font-semibold" style={{ color: ifNotColor }}>
                                                                        {TEAM_METADATA[ifNotAbbr]?.city ?? ifNotInRangeTo}
                                                                    </span>
                                                                </div>
                                                                {notCondProb !== null && (
                                                                    <div className="text-sm font-black opacity-60">{(notCondProb * 100).toFixed(1)}%</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* ── BACKUP TRIGGERS ── */}
                            {isBackup && !isProBackup && hasTriggers && (
                                <div className="glass-card rounded-2xl p-6 space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold tracking-wide">Routing</h2>
                                        <p className="text-xs opacity-40 mt-1">
                                            This pick's destination depends on the outcome of the trigger pick below.
                                        </p>
                                    </div>

                                    {/* Simple backup: top-level triggers */}
                                    {rawTriggers.length > 0 && (
                                        <div className="space-y-2">
                                            {rawTriggers.map((trigger, i) => {
                                                const info  = parsePickId(trigger.pick);
                                                const tPick = pickIdMap.get(trigger.pick);
                                                const href  = info ? `/picks/${info.year}/${info.round}/${info.teamAbbr.toLowerCase()}` : null;
                                                const prob  = tPick ? triggerProb(tPick, trigger.condition) : null;
                                                return (
                                                    <div key={i}>
                                                        {rawTriggers.length > 1 && i > 0 && (
                                                            <div className="text-center text-[10px] font-black opacity-30 uppercase tracking-widest py-1">
                                                                {trigger_logic}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
                                                            {info && <TeamLogo abbr={info.teamAbbr} size={32} />}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-bold">{pickLabel(trigger.pick)}</div>
                                                                <div className="text-xs opacity-50 mt-0.5">{formatCondition(trigger.condition)}</div>
                                                            </div>
                                                            {prob !== null && href && (
                                                                <a href={href} className="shrink-0 rounded-md px-2.5 py-1 text-sm font-black bg-neutral-800 border border-white/10 text-white">
                                                                    {(prob * 100).toFixed(1)}%
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {(if_triggered_to || if_not_triggered_to) && (() => {
                                                // The trigger range belongs to the trigger pick (shown on its row
                                                // above), not this one — don't repeat it here where it reads as
                                                // this pick's landing range.
                                                const triggeredLabel = "IF TRIGGERED";
                                                const notTriggeredLabel = "IF NOT TRIGGERED";
                                                return (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                        {if_triggered_to && (
                                                            <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-3 space-y-1.5">
                                                                <div className="text-[9px] font-black uppercase tracking-widest text-green-400 opacity-80">{triggeredLabel}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <TeamLogo abbr={abbrFor(if_triggered_to)} size={24} />
                                                                    <span className="text-xs font-semibold">{cityFor(if_triggered_to)}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {if_not_triggered_to && (
                                                            <div className="rounded-xl border border-white/10 bg-white/3 p-3 space-y-1.5">
                                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-30">{notTriggeredLabel}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <TeamLogo abbr={abbrFor(if_not_triggered_to)} size={24} />
                                                                    <span className="text-xs font-semibold">{cityFor(if_not_triggered_to)}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Branched backup: branches array */}
                                    {rawBranches.length > 0 && (
                                        <div className="space-y-3">
                                            {rawBranches.map((branch: any, bi: number) => (
                                                <div key={bi} className="rounded-xl border border-white/10 bg-white/2 p-4 space-y-3">
                                                    <div className="text-[9px] font-black uppercase tracking-widest opacity-30">
                                                        {branch.label?.replace(/_/g, " ")}
                                                    </div>

                                                    {(branch.triggers ?? []).map((trigger: any, ti: number) => {
                                                        const info  = parsePickId(trigger.pick);
                                                        const tPick = pickIdMap.get(trigger.pick);
                                                        const href  = info ? `/picks/${info.year}/${info.round}/${info.teamAbbr.toLowerCase()}` : null;
                                                        const prob  = tPick ? triggerProb(tPick, trigger.condition) : null;
                                                        return (
                                                            <div key={ti}>
                                                                {(branch.triggers ?? []).length > 1 && ti > 0 && (
                                                                    <div className="text-center text-[10px] font-black opacity-30 uppercase tracking-widest py-1">
                                                                        {branch.trigger_logic}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-3 rounded-lg border border-white/8 px-3 py-2.5">
                                                                    {info && <TeamLogo abbr={info.teamAbbr} size={28} />}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-bold">{pickLabel(trigger.pick)}</div>
                                                                        <div className="text-[10px] opacity-50 mt-0.5">{formatCondition(trigger.condition)}</div>
                                                                    </div>
                                                                    {prob !== null && href && (
                                                                        <a href={href} className="shrink-0 rounded px-2 py-0.5 text-xs font-black bg-neutral-800 border border-white/10 text-white">
                                                                            {(prob * 100).toFixed(1)}%
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    <div className="grid grid-cols-2 gap-2">
                                                        {branch.if_triggered_and_not_protected_to && (
                                                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                                                                <div className="text-[8px] font-black uppercase tracking-widest text-green-400 opacity-70 mb-1">Triggered + free</div>
                                                                <span className="text-xs font-semibold">{cityFor(branch.if_triggered_and_not_protected_to)}</span>
                                                            </div>
                                                        )}
                                                        {branch.if_triggered_and_protected_to && (
                                                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                                                                <div className="text-[8px] font-black uppercase tracking-widest text-blue-400 opacity-70 mb-1">Triggered + protected</div>
                                                                <span className="text-xs font-semibold">{cityFor(branch.if_triggered_and_protected_to)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {branch.fallback_pick && (
                                                        <div className="text-[10px] opacity-30">
                                                            Fallback → {pickLabel(branch.fallback_pick)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {rawPick?.rules?.if_not_triggered_and_not_protected_to && (
                                                <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-3 text-xs">
                                                    <div className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">If no branch triggers</div>
                                                    <span className="font-semibold">{cityFor(rawPick.rules.if_not_triggered_and_not_protected_to)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PRO BACKUP ROUTING (trigger × protection) ── */}
                            {isProBackup && proRange && (() => {
                                const [pMin, pMax] = proRange;
                                const slotMin = pick.round === 1 ? 1 : 31;
                                const slotMax = pick.round === 1 ? 30 : 60;
                                const availRange: [number, number] = rawPick?.rules?.available_range
                                    ?? [pMax + 1, slotMax];
                                const protLabel  = pMin === 1 ? `Top ${pMax}` : `${pMin}–${pMax}`;
                                const availLabel = `${availRange[0]}–${availRange[1]}`;
                                const anyLabel   = `${slotMin}–${slotMax}`;

                                const destRow = (
                                    kind: "protected" | "conveys" | "any",
                                    rangeLabel: string,
                                    team: string,
                                ) => {
                                    const keeps = team === pick.original_team;
                                    const boxCls = kind === "protected"
                                        ? "rounded-xl border border-blue-500/30 bg-blue-500/8 px-5 py-3.5 flex items-center gap-4"
                                        : "rounded-xl border border-white/8 px-5 py-3.5 flex items-center gap-4";
                                    const tagCls = kind === "protected"
                                        ? "text-[10px] font-black uppercase tracking-widest text-blue-400"
                                        : kind === "conveys"
                                            ? "text-[10px] font-black uppercase tracking-widest text-green-400"
                                            : "text-[10px] font-black uppercase tracking-widest opacity-40";
                                    const rangeCls = kind === "protected"
                                        ? "text-xl font-black text-blue-300 tabular-nums leading-none"
                                        : "text-xl font-black tabular-nums leading-none opacity-70";
                                    const tag = kind === "protected" ? "PROTECTED" : kind === "conveys" ? "CONVEYS" : "ANY RESULT";
                                    return (
                                        <div key={`${tag}-${team}`} className={boxCls}>
                                            <div className="shrink-0 flex flex-col items-center gap-1 min-w-[56px]">
                                                <span className={tagCls}>{tag}</span>
                                                <span className={rangeCls}>{rangeLabel}</span>
                                            </div>
                                            <div className="w-px h-10 bg-white/10 shrink-0" />
                                            <TeamLogo abbr={abbrFor(team)} size={36} />
                                            <span className="text-base font-semibold">
                                                {cityFor(team)} {keeps ? "keeps it" : "receives it"}
                                            </span>
                                        </div>
                                    );
                                };

                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-5">
                                        <div>
                                            <h2 className="text-lg font-bold tracking-wide">Routing</h2>
                                            <p className="text-xs opacity-40 mt-1">
                                                Destination depends on the trigger below and where this pick lands.
                                            </p>
                                        </div>

                                        {/* Trigger rows */}
                                        <div className="space-y-2">
                                            {rawTriggers.map((trigger, i) => {
                                                const info  = parsePickId(trigger.pick);
                                                const tPick = pickIdMap.get(trigger.pick);
                                                const href  = info ? `/picks/${info.year}/${info.round}/${info.teamAbbr.toLowerCase()}` : null;
                                                const prob  = tPick ? triggerProb(tPick, trigger.condition) : null;
                                                return (
                                                    <div key={i}>
                                                        {rawTriggers.length > 1 && i > 0 && (
                                                            <div className="text-center text-[10px] font-black opacity-30 uppercase tracking-widest py-1">
                                                                {trigger_logic}
                                                            </div>
                                                        )}
                                                        <a href={href ?? "#"}
                                                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 hover:border-white/20 transition-colors">
                                                            {info && <TeamLogo abbr={info.teamAbbr} size={32} noLink />}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-bold">{pickLabel(trigger.pick)}</div>
                                                                <div className="text-xs opacity-50 mt-0.5">{formatCondition(trigger.condition)}</div>
                                                            </div>
                                                            {prob !== null && (
                                                                <div className="shrink-0 text-right">
                                                                    <div className="text-[9px] opacity-40 uppercase leading-none">Triggers</div>
                                                                    <div className="text-sm font-black mt-0.5">{(prob * 100).toFixed(1)}%</div>
                                                                </div>
                                                            )}
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* If triggered */}
                                        <div className="space-y-2">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-green-400 opacity-80">
                                                If Triggered
                                            </div>
                                            {pbTP === pbTN
                                                ? destRow("any", anyLabel, pbTP!)
                                                : <>
                                                    {destRow("protected", protLabel, pbTP!)}
                                                    {destRow("conveys", availLabel, pbTN!)}
                                                </>}
                                        </div>

                                        {/* If not triggered */}
                                        <div className="space-y-2">
                                            <div className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                                If Not Triggered
                                            </div>
                                            {pbNP === pbNN
                                                ? destRow("any", anyLabel, pbNP!)
                                                : <>
                                                    {destRow("protected", protLabel, pbNP!)}
                                                    {destRow("conveys", availLabel, pbNN!)}
                                                </>}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── PRO PICK ROUTING ── */}
                            {rawPickType === "pro_pick" && proRange && proKeeperTeam && proRecipientTeam && (
                                <div className="glass-card rounded-2xl p-6 space-y-4">
                                    <h2 className="text-lg font-bold tracking-wide">Routing</h2>
                                    <div className="space-y-2">
                                        {/* Protected row */}
                                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/8 px-5 py-4 flex items-center gap-4">
                                            <div className="shrink-0 flex flex-col items-center gap-1 min-w-[56px]">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">PROTECTED</span>
                                                <span className="text-3xl font-black text-blue-300 tabular-nums leading-none">
                                                    {proRange[0] === 1 ? `Top ${proRange[1]}` : `${proRange[0]}–${proRange[1]}`}
                                                </span>
                                            </div>
                                            <div className="w-px h-10 bg-white/10 shrink-0" />
                                            <TeamLogo abbr={abbrFor(proKeeperTeam)} size={36} />
                                            <span className="text-base font-semibold">{cityFor(proKeeperTeam)} keeps it</span>
                                        </div>
                                        {/* Conveys row */}
                                        {(() => {
                                            const slotMin = pick.round === 1 ? 1 : 31;
                                            const slotMax = pick.round === 1 ? 30 : 60;
                                            const convMin = proRange[0] === slotMin ? proRange[1] + 1 : slotMin;
                                            const convMax = proRange[1] === slotMax ? proRange[0] - 1 : slotMax;
                                            const convLabel = `${convMin}–${convMax}`;
                                            return (
                                        <div className="rounded-xl border border-white/8 px-5 py-4 flex items-center gap-4">
                                            <div className="shrink-0 flex flex-col items-center gap-1 min-w-[56px]">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">CONVEYS</span>
                                                <span className="text-xl font-black tabular-nums leading-none opacity-70">
                                                    {convLabel}
                                                </span>
                                            </div>
                                            <div className="w-px h-10 bg-white/10 shrink-0" />
                                            <TeamLogo abbr={abbrFor(proRecipientTeam)} size={36} />
                                            <span className="text-base font-semibold">{cityFor(proRecipientTeam)} receives it</span>
                                        </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* ── OWNERSHIP (non-swap) ── */}
                            {!isSwap && !isSpecialPoolSwap && !isSwapGroup && !isNestedSwap && (
                                <div className="glass-card rounded-2xl p-6 space-y-5">
                                    <h2 className="text-lg font-bold tracking-wide">Ownership</h2>
                                    {isMulti ? (
                                        <div className="space-y-3">
                                            {sortedOwners.map((o, i) => {
                                                const oAbbr  = abbrFor(o.team);
                                                const oColor = teamColors[oAbbr] ?? "#555";
                                                const pct    = o.prob >= 1 ? 99.9 : Math.round(o.prob * 100);
                                                const ev     = (o.prob * o.conditional_ev).toFixed(1);
                                                return (
                                                    <div key={o.team} className="flex items-center gap-4">
                                                        <span className="text-xs opacity-30 w-4 text-right shrink-0">{i + 1}</span>
                                                        <div className="shrink-0"><TeamLogo abbr={oAbbr} size={36} /></div>
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold truncate">{TEAM_METADATA[oAbbr]?.full ?? o.team}</span>
                                                                <span className="text-xs font-black opacity-70 shrink-0 ml-2">{pct}%</span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                                <div className="h-full rounded-full"
                                                                    style={{ width: `${pct}%`, backgroundColor: oColor, boxShadow: `0 0 6px ${oColor}80` }} />
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <div className="text-[10px] opacity-40 uppercase">EV</div>
                                                            <div className="text-sm font-black">{ev}</div>
                                                            <div className="text-[9px] opacity-25 tabular-nums">cEV {o.conditional_ev.toFixed(1)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-5">
                                            <TeamLogo abbr={abbrFor(primaryOwner?.team ?? teamAbbr)} size={64} />
                                            <div>
                                                <div className="text-xl font-bold">
                                                    {isOwnPick
                                                        ? "Owned by original team"
                                                        : `Owned by ${TEAM_METADATA[abbrFor(primaryOwner?.team)]?.full ?? primaryOwner?.team}`}
                                                </div>
                                                {!isOwnPick && (
                                                    <div className="text-sm opacity-50 mt-0.5">Originally from {teamMeta.full}</div>
                                                )}
                                                <div className="text-sm font-semibold text-green-400/70 mt-1">
                                                    {isOwnPick
                                                        ? "Guaranteed — no trade conditions"
                                                        : "Guaranteed — unprotected, conveys unconditionally"}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── FALLBACK ── */}
                            {(rawPickType === "pro_pick" || isProBackup) && (() => {
                                const rawFb = rawPick?.rules?.fallback_pick;
                                const fbIds: string[] | null = !rawFb || rawFb === "none" ? null
                                    : Array.isArray(rawFb) ? rawFb : [rawFb];
                                // pro_backup always resolves to someone — only show the card
                                // when a real fallback pick exists.
                                if (isProBackup && !fbIds) return null;
                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-4">
                                        <h2 className="text-lg font-bold tracking-wide">Fallback</h2>
                                        {!fbIds ? (
                                            <span className="text-sm opacity-40">Obligation expires — if this pick never conveys, no further pick is owed.</span>
                                        ) : (
                                            <div className="space-y-2">
                                                {fbIds.map(id => {
                                                    const info = parsePickId(id);
                                                    const fbPick = info ? pickIdMap.get(id) : null;
                                                    const fbAbbr = info?.teamAbbr ?? id;
                                                    return (
                                                        <a
                                                            key={id}
                                                            href={info ? `/picks/${info.year}/${info.round}/${fbAbbr.toLowerCase()}` : "#"}
                                                            className="glass-row flex items-center gap-4 rounded-xl px-4 py-3"
                                                        >
                                                            <TeamLogo abbr={fbAbbr} size={40} noLink />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-semibold">
                                                                    {info ? `${fbAbbr} ${info.year} ${info.round === 1 ? "1st" : "2nd"} Round` : id}
                                                                </div>
                                                                {fbPick && (
                                                                    <div className="text-xs opacity-40 mt-0.5">{fbPick.pick_type.replace(/_/g, " ")}</div>
                                                                )}
                                                            </div>
                                                            {fbPick && (
                                                                <div className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-black ${evStyles(fbPick.ev, fbPick.round).bg} ${evStyles(fbPick.ev, fbPick.round).text}`}>
                                                                    {fbPick.ev.toFixed(1)}
                                                                </div>
                                                            )}
                                                            <span className="text-white/20 text-xs shrink-0">→</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* ── POOL ── */}
                            {pickPoolMeta && poolMembers.length > 0 && (() => {
                                const recipient = cityFor(pickPoolMeta.pool_resolution.to);
                                const rankLabel = pickPoolMeta.pool_resolution.rank === "lf" ? "worst" : pickPoolMeta.pool_resolution.rank;
                                const entersIfTeam = pickPoolMeta.enters_pool_if?.resolves_to
                                    ? cityFor(pickPoolMeta.enters_pool_if.resolves_to) : null;
                                return (
                                    <div className="glass-card rounded-2xl p-6 space-y-4">
                                        <div>
                                            <h2 className="text-lg font-bold tracking-wide">Outgoing Pool</h2>
                                            <p className="text-xs opacity-40 mt-1">
                                                {entersIfTeam
                                                    ? `If this pick resolves to ${entersIfTeam}, it enters this group. The ${rankLabel}-slotted pick among all ${entersIfTeam}-owned picks in the group goes to ${recipient}.`
                                                    : `The ${rankLabel}-slotted pick in this group goes to ${recipient}.`}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            {poolMembers.map(({ pick: mp, raw: mr }) => {
                                                const mAbbr = abbrFor(mp.original_team);
                                                const { bg: mbg, text: mtxt } = evStyles(mp.ev, mp.round);
                                                const isThis = mp.pick_id === pick.pick_id;
                                                const entersIf = mr.pool?.enters_pool_if?.resolves_to;
                                                return (
                                                    <a
                                                        key={mp.pick_id}
                                                        href={`/picks/${mp.year}/${mp.round}/${mAbbr.toLowerCase()}`}
                                                        className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${isThis ? "border-white/20 bg-white/6" : "border-white/8 bg-white/2 hover:border-white/15"}`}
                                                    >
                                                        <TeamLogo abbr={mAbbr} size={36} noLink />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold truncate">{mp.original_team}</div>
                                                            <div className="text-xs opacity-40 mt-0.5">
                                                                {entersIf ? `enters if → ${cityFor(entersIf)}` : "always in pool"}
                                                            </div>
                                                        </div>
                                                        <div className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-black ${mbg} ${mtxt}`}>
                                                            {mp.ev.toFixed(1)}
                                                        </div>
                                                        {!isThis && <span className="text-white/20 text-xs shrink-0">→</span>}
                                                        {isThis && <span className="text-white/40 text-xs font-bold shrink-0">this pick</span>}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── PICK ID ── */}
                            <div className="glass-surface rounded-xl border border-white/5 px-4 py-3 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-widest opacity-30">Pick ID</span>
                                <span className="text-[10px] font-mono opacity-40">{pick.pick_id}</span>
                            </div>

                            {/* ── COMMENTS ── */}
                            <PickComments pickId={pick.pick_id} />

                        </div>
                    );
                })}

            </div>
        </div>
    );
}
