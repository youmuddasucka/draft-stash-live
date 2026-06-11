import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import { LOTTERY_TEAMS, PLAYOFF_TEAMS, ROUND2_TEAMS, type DraftEntry } from "@/lib/draft2026Data";
import type { SimPickCard } from "@/lib/loadSimPickCards";
import type { SimTeamPickCard } from "@/lib/loadSimTeamPickCards";
import { PICK_TYPE_INFO } from "@/lib/picks/constants";

/**
 * "Stash" — the true expected value of a pick to the team that holds it.
 * For non-swap picks the team only ends up with the pick with probability
 * `prob` (protected picks convey away, backups depend on a trigger), so the
 * value is weighted by it. Swaps already resolve to exactly one held pick, so
 * their conditional value is the realized value.
 * Used by both the card display and the value sort so they never diverge.
 */
export function stashValue(card: SimTeamPickCard): number {
    return isSwapType(card.pick_type) ? card.conditional_ev : card.prob * card.conditional_ev;
}

export function getPickTypeInfo(pt: string) {
    return PICK_TYPE_INFO[pt] ?? {
        label: pt.replace(/_/g, " "), tag: pt.toUpperCase(),
        borderColor: "rgba(255,255,255,0.15)", description: "Pick type details unavailable.",
    };
}

export function isSwapType(pt: string): boolean { return pt.includes("swap"); }
export function isBackupType(pt: string): boolean { return pt.includes("backup"); }

/**
 * Display label for backup picks on the list/card views (Teams, All Picks).
 * All backups read simply "Backup"; protected variants (pro_backup,
 * pro_backup_branched) append a lock + the protected range, e.g.
 * "Backup 🔒 (31-45)". Returns null for non-backup types.
 */
export function backupPillLabel(pt: string, range?: [number, number] | null): string | null {
    if (!isBackupType(pt)) return null;
    if (pt.startsWith("pro_") && range && range.length === 2) {
        return `Backup 🔒 (${range[0]}-${range[1]})`;
    }
    return "Backup";
}

/**
 * Picks the destination to show as the "other" outcome for a conditional pick
 * the sim resolved as a near-certainty. Prefers the original team staying home,
 * otherwise the first possible destination that isn't the current owner.
 */
export function nearCertainAlternate(
    dests: string[] | undefined, owner: string | undefined, originalTeam: string,
): string | null {
    const d = dests ?? [];
    if (owner && originalTeam !== owner && d.includes(originalTeam)) return originalTeam;
    const other = d.find(t => t !== owner);
    if (other) return other;
    return owner && originalTeam !== owner ? originalTeam : null;
}

/**
 * Collapses the 11 raw pick_type values into 5 user-facing buckets.
 * Used for the /picks type filter so users don't have to know the engine taxonomy.
 * Order matters: swap/backup substrings must be checked before the exact matches.
 */
export type PickBucket = "Unprotected" | "Swap" | "Protected" | "Backup" | "Special";
export const PICK_BUCKETS: PickBucket[] = ["Unprotected", "Swap", "Protected", "Backup", "Special"];
export function pickTypeBucket(pt: string): PickBucket {
    if (isSwapType(pt))      return "Swap";
    if (isBackupType(pt))    return "Backup";
    if (pt === "unprotected") return "Unprotected";
    if (pt === "special")     return "Special";
    return "Protected";
}
export function roundLabel(r: number): string { return r === 1 ? "1st Round" : r === 2 ? "2nd Round" : `Round ${r}`; }

export function abbrFor(fullName: string): string { return TEAM_FULL_TO_ABBR[fullName] ?? fullName; }
export function cityFor(fullName: string): string {
    const a = abbrFor(fullName);
    return TEAM_METADATA[a]?.city ?? fullName;
}

function originalAbbrFrom(entry: DraftEntry): string {
    if (!entry.note) return entry.id;
    const m = entry.note.match(/^via (.+)$/);
    return m ? m[1] : entry.id;
}

export function find2026Entry(teamAbbr: string, round: number): { slot: number; entry: DraftEntry } | null {
    const r1 = [...LOTTERY_TEAMS, ...PLAYOFF_TEAMS];
    const arr = round === 1 ? r1 : ROUND2_TEAMS;
    for (let i = 0; i < arr.length; i++) {
        if (originalAbbrFrom(arr[i]) === teamAbbr) {
            const slot = round === 1
                ? (i < LOTTERY_TEAMS.length ? i + 1 : i - LOTTERY_TEAMS.length + 15)
                : i + 1;
            return { slot, entry: arr[i] };
        }
    }
    return null;
}

export function formatRange([min, max]: [number, number]): string {
    if (min === 1 && max === 1)  return "falls #1 overall";
    if (min === max)             return `falls at pick ${min}`;
    if (min === 1 && max === 14) return "falls in the lottery (top 14)";
    if (min === 1)               return `falls in the top ${max}`;
    return `falls between picks ${min}–${max}`;
}

export function formatCondition(condition: any): string {
    if (!condition)        return "any result";
    if (condition.range)   return formatRange(condition.range);
    return "specific condition";
}

export function parsePickId(pickId: string): { teamAbbr: string; year: number; round: number } | null {
    const m = pickId.match(/^(.+)_(\d{4})_([12])$/);
    if (!m) return null;
    const abbr = TEAM_FULL_TO_ABBR[m[1].replace(/_/g, " ")] ?? m[1].replace(/_/g, " ");
    return { teamAbbr: abbr, year: Number(m[2]), round: Number(m[3]) };
}

export function pickLabel(pickId: string): string {
    const info = parsePickId(pickId);
    if (!info) return pickId;
    return `${info.teamAbbr} ${info.year} ${info.round === 1 ? "1st" : "2nd"} Round`;
}

export function triggerProb(pick: SimPickCard, condition: any): number | null {
    if (!condition?.range || !pick.slot_probs) return null;
    const [min, max] = condition.range as [number, number];
    let prob = 0;
    for (let slot = min; slot <= max; slot++) {
        prob += pick.slot_probs[slot] ?? 0;
    }
    return prob;
}
