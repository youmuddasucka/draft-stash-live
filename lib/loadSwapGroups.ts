import fs from "fs";
import path from "path";
import type { SimPickCard } from "./loadSimPickCards";
import { TEAM_FULL_TO_ABBR } from "./teamMetadata";

const TEAM_FOLDER: Record<string, string> = {
    ATL: "atlanta",     BOS: "boston",              BKN: "brooklyn",
    CHA: "charlotte",   CHI: "chicago",             CLE: "cleveland",
    DAL: "dallas",      DEN: "denver",              DET: "detroit",
    GSW: "golden_state", HOU: "houston",            IND: "indiana",
    LAC: "los_angeles_clippers", LAL: "los_angeles_lakers",
    MEM: "memphis",     MIA: "miami",               MIL: "milwaukee",
    MIN: "minnesota",   NOP: "new_orleans",         NYK: "new_york",
    OKC: "oklahoma_city", ORL: "orlando",           PHI: "philadelphia",
    PHX: "phoenix",     POR: "portland",            SAC: "sacramento",
    SAS: "san_antonio", TOR: "toronto",             UTA: "utah",
    WAS: "washington",
};

export type SwapGroupEntry = {
    pick: SimPickCard;
    rank: number;
    recipient: string | null;
    recAbbr: string | null;
};

export type SwapGroup = {
    swap_id: string;
    pick_type: string;
    year: number;
    round: number;
    entries: SwapGroupEntry[];
    bestEv: number;
    worstEv: number;
};

function loadRules(pickId: string, abbr: string): any | null {
    const folder = TEAM_FOLDER[abbr];
    if (!folder) return null;
    const fp = path.join(process.cwd(), "public", "pick-data", "teams", folder, `${pickId}.json`);
    try {
        return JSON.parse(fs.readFileSync(fp, "utf-8")).rules ?? null;
    } catch {
        return null;
    }
}

export function loadSwapGroups(allPicks: SimPickCard[]): SwapGroup[] {
    const pickIdMap = new Map(allPicks.map(p => [p.pick_id, p]));
    const swapPicks = allPicks.filter(p => p.pick_type.includes("swap"));

    const seen = new Map<string, { rules: any; refPick: SimPickCard }>();

    for (const pick of swapPicks) {
        const abbr = TEAM_FULL_TO_ABBR[pick.original_team] ?? pick.original_team;
        const rules = loadRules(pick.pick_id, abbr);
        if (!rules) continue;
        const swapId = rules.swap_id ?? pick.pick_id;
        if (!seen.has(swapId)) seen.set(swapId, { rules, refPick: pick });
    }

    const groups: SwapGroup[] = [];

    for (const [swap_id, { rules, refPick }] of seen) {
        let pool: string[] = [];
        let allocation: { rank: string; to: string }[] = [];
        let hasDirectAlloc = false;

        if (rules.pool?.length) {
            pool = rules.pool
                .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                .filter((id: string | null) => id && !id.startsWith("TEMP_"));
            allocation = rules.allocation ?? [];
            hasDirectAlloc = allocation.length > 0;
        } else if (rules.levels?.length === 1) {
            const lvl = rules.levels[0];
            pool = (lvl.pool ?? [])
                .map((e: any) => typeof e === "string" ? e : (e.pick ?? null))
                .filter((id: string | null) => id && !id.startsWith("TEMP_"));
            allocation = lvl.allocation ?? [];
            hasDirectAlloc = allocation.length > 0;
        } else if (rules.levels?.length > 1) {
            const poolSeen = new Set<string>();
            for (const level of rules.levels) {
                for (const e of (level.pool ?? [])) {
                    const id = typeof e === "string" ? e : (e.pick ?? null);
                    if (id && !id.startsWith("TEMP_")) poolSeen.add(id);
                }
            }
            pool = [...poolSeen];
        }

        if (pool.length === 0) continue;

        const poolPicks = pool.map(id => pickIdMap.get(id)).filter(Boolean) as SimPickCard[];
        if (poolPicks.length === 0) continue;

        const sorted = [...poolPicks].sort((a, b) => b.ev - a.ev);

        const entries: SwapGroupEntry[] = sorted.map((p, i) => {
            const rank = i + 1;
            let recipient: string | null = null;
            if (hasDirectAlloc) {
                recipient = allocation.find(a => Number(a.rank) === rank)?.to ?? null;
            } else {
                recipient = p.ownership[0]?.team ?? null;
            }
            const recAbbr = recipient ? (TEAM_FULL_TO_ABBR[recipient] ?? recipient) : null;
            return { pick: p, rank, recipient, recAbbr };
        });

        groups.push({
            swap_id,
            pick_type: refPick.pick_type,
            year: refPick.year,
            round: refPick.round,
            entries,
            bestEv: sorted[0].ev,
            worstEv: sorted[sorted.length - 1].ev,
        });
    }

    return groups;
}
