import { loadSimPickCards } from "@/lib/loadSimPickCards";
import { loadSwapGroups } from "@/lib/loadSwapGroups";
import AllPicksClient from "./AllPicksClient";

export default function AllPicksPage() {
    const allPicks   = loadSimPickCards();
    const swapGroups = loadSwapGroups(allPicks);

    const swapPickIds = new Set(
        swapGroups.flatMap(g => g.entries.map(e => e.pick.pick_id))
    );
    const regularPicks = allPicks.filter(p => !swapPickIds.has(p.pick_id));

    return (
        <div className="glass-bg min-h-screen">
            <AllPicksClient picks={regularPicks} swapGroups={swapGroups} />
        </div>
    );
}
