import { loadSimPickCards } from "@/lib/loadSimPickCards";
import { loadSwapGroups } from "@/lib/loadSwapGroups";
import AllPicksClient from "./AllPicksClient";

type SearchParams = Promise<{ year?: string; round?: string }>;

export default async function AllPicksPage({ searchParams }: { searchParams: SearchParams }) {
    const { year, round } = await searchParams;
    const allPicks   = loadSimPickCards();
    const swapGroups = loadSwapGroups(allPicks);

    const swapPickIds = new Set(
        swapGroups.flatMap(g => g.entries.map(e => e.pick.pick_id))
    );
    const regularPicks = allPicks.filter(p => !swapPickIds.has(p.pick_id));

    const initialYear = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
    const initialRound = round === "1" || round === "2" ? (Number(round) as 1 | 2) : undefined;

    return (
        <div className="glass-bg min-h-screen">
            <AllPicksClient
                key={`${initialYear ?? "all"}-${initialRound ?? "all"}`}
                picks={regularPicks}
                swapGroups={swapGroups}
                initialYear={initialYear}
                initialRound={initialRound}
            />
        </div>
    );
}
