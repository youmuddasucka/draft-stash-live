import fs from "fs";
import path from "path";
import { loadRawPickById } from "@/lib/picks/loaders";

export type OwnerEntry = {
    team: string;
    prob: number;
    conditional_ev: number;
};

export type SimPickCard = {
    pick_id: string;
    year: number;
    round: number;
    original_team: string;
    pick_type: string;
    frozen: boolean;
    ev: number;
    expected_slot: number;
    ownership: OwnerEntry[];
    slot_probs?: Record<number, number>;
    /** Lottery-protection range of a protected backup pick (pro_backup /
     *  pro_backup_branched). Not present in the sim output — enriched from the
     *  raw pick JSON so the card views can render the lock + range. */
    protected_range?: [number, number];
    /** Possible destinations of a conditional pick — enriched from the raw pick
     *  JSON so the card can show the alternate outcome on near-certain picks. */
    possible_destinations?: string[];
};

export function loadSimPickCards(): SimPickCard[] {
    const filePath = path.join(process.cwd(), "public", "sim-output", "pick_cards.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const cards = JSON.parse(raw) as SimPickCard[];

    // Conditional picks (protected / backup) carry their protection range and
    // possible destinations only in the raw pick JSON; the card views need both.
    for (const card of cards) {
        const conditional = card.pick_type === "pro_pick" || card.pick_type.includes("backup");
        if (!conditional) continue;
        const rules = loadRawPickById(card.pick_id)?.rules;
        if (!rules) continue;
        const r = rules.protection_range ?? rules.branches?.[0]?.protection_range;
        if (Array.isArray(r) && r.length === 2) card.protected_range = [r[0], r[1]];
        if (Array.isArray(rules.possible_destinations)) card.possible_destinations = rules.possible_destinations;
    }
    return cards;
}
