import { loadSimTeamPickCards } from "@/lib/loadSimTeamPickCards";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";

export type StashRanking = {
    team: string; // abbr
    fullName: string;
    score: number;
};

let cached: StashRanking[] | null = null;

export function computeStashRankings(): StashRanking[] {
    if (cached) return cached;

    const cards = loadSimTeamPickCards();
    const totals = new Map<string, number>();

    for (const c of cards) {
        const prev = totals.get(c.team) ?? 0;
        totals.set(c.team, prev + c.prob * c.conditional_ev);
    }

    cached = Array.from(totals.entries())
        .map(([fullName, score]) => ({
            team: TEAM_FULL_TO_ABBR[fullName] ?? fullName,
            fullName,
            score,
        }))
        .sort((a, b) => b.score - a.score);

    return cached;
}
