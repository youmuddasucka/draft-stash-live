import { loadSimPickCards } from "@/lib/loadSimPickCards";
import ValueScaleClient from "./ValueScaleClient";

export type PickSummary = {
    pick_id: string;
    year: number;
    round: number;
    pick_type: string;
    original_team: string;
    expected_slot: number;
    slot_probs: Record<string, number>;
    ev: number;
};

export default function ValueScalePage() {
    const allPicks = loadSimPickCards();
    const picks: PickSummary[] = allPicks.map(p => ({
        pick_id: p.pick_id,
        year: p.year,
        round: p.round,
        pick_type: p.pick_type,
        original_team: p.original_team,
        expected_slot: p.expected_slot ?? 0,
        slot_probs: (p.slot_probs ?? {}) as Record<string, number>,
        ev: p.ev,
    }));
    return <ValueScaleClient picks={picks} />;
}
