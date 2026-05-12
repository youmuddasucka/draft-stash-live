import fs from "fs";
import path from "path";

export type SimTeamPickCard = {
    team: string;
    pick_id: string;
    year: number;
    round: number;
    original_team: string;
    pick_type: string;
    frozen: boolean;
    prob: number;
    ev: number;
    conditional_ev: number;
};

export function loadSimTeamPickCards(): SimTeamPickCard[] {
    const filePath = path.join(process.cwd(), "public", "sim-output", "team_pick_cards.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SimTeamPickCard[];
}
