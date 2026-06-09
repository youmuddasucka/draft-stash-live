import fs from "fs";
import path from "path";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import type { SimPickCard } from "@/lib/loadSimPickCards";
import { TEAM_FOLDER } from "@/lib/picks/constants";

export function loadRawPick(pickId: string, teamAbbr: string): any | null {
    const folder = TEAM_FOLDER[teamAbbr];
    if (!folder) return null;
    const filePath = path.join(
        process.cwd(), "public", "pick-data", "teams", folder, `${pickId}.json`
    );
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
        return null;
    }
}

const PICK_ID_RE = /^[A-Za-z_]+_\d{4}_[12]$/;

export function loadRawPickById(pickId: string): any | null {
    const match = pickId.match(/^(.+)_\d{4}_[12]$/);
    if (!match) return null;
    const abbr = TEAM_FULL_TO_ABBR[match[1].replace(/_/g, " ")];
    return abbr ? loadRawPick(pickId, abbr) : null;
}

export function collectPickIds(obj: any): string[] {
    if (!obj) return [];
    if (typeof obj === "string") return PICK_ID_RE.test(obj) ? [obj] : [];
    if (Array.isArray(obj))      return obj.flatMap(collectPickIds);
    if (typeof obj === "object") return Object.values(obj).flatMap(collectPickIds);
    return [];
}

export function buildRelatedChain(startId: string, allPicks: SimPickCard[]): Set<string> {
    const adj = new Map<string, Set<string>>();
    for (const p of allPicks) {
        const raw = loadRawPickById(p.pick_id);
        if (!raw?.rules) continue;
        const refs = collectPickIds(raw.rules).filter(id => id !== p.pick_id);
        if (!adj.has(p.pick_id)) adj.set(p.pick_id, new Set());
        for (const refId of refs) {
            adj.get(p.pick_id)!.add(refId);
            if (!adj.has(refId)) adj.set(refId, new Set());
            adj.get(refId)!.add(p.pick_id);
        }
    }

    const visited = new Set([startId]);
    const queue   = [startId];
    while (queue.length) {
        const cur = queue.shift()!;
        for (const neighbor of (adj.get(cur) ?? [])) {
            if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
        }
    }
    visited.delete(startId);
    return visited;
}
