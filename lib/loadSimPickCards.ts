import fs from "fs";
import path from "path";

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
};

export function loadSimPickCards(): SimPickCard[] {
    const filePath = path.join(process.cwd(), "public", "sim-output", "pick_cards.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SimPickCard[];
}
