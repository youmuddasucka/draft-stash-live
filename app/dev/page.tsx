import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import DevAuditClient from "@/components/DevAuditClient";

export const dynamic = "force-dynamic";

export interface PickInfo {
  pick_id: string;
  year: number;
  round: number;
  original_team: string;
  abbr: string;
}

export interface AuditGroup {
  id: string;
  type: string;
  picks: PickInfo[];
}

const TYPE_ORDER: Record<string, number> = {
  nested_swap: 0,
  triple_swap: 1,
  pro_triple_swap: 2,
  unpro_swap: 3,
  pro_swap: 4,
  cond_alloc_swap: 5,
  special: 6,
  pro_backup_branched: 7,
  pro_backup: 8,
  unpro_backup: 9,
  pro_pick: 10,
};

function loadGroups(): AuditGroup[] {
  const teamsDir = join(process.cwd(), "public/pick-data/teams");
  const groupMap = new Map<string, { type: string; picks: PickInfo[] }>();

  for (const teamFolder of readdirSync(teamsDir)) {
    const teamPath = join(teamsDir, teamFolder);
    let files: string[];
    try { files = readdirSync(teamPath); } catch { continue; }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      let raw: any;
      try { raw = JSON.parse(readFileSync(join(teamPath, file), "utf8")); } catch { continue; }

      const type: string = raw.rules?.type ?? "unknown";
      if (type === "unprotected") continue;

      const swapId: string | null = raw.rules?.swap_id ?? raw.rules?.swap_group ?? null;
      const groupKey = swapId ?? raw.pick_id;

      const info: PickInfo = {
        pick_id: raw.pick_id,
        year: raw.year,
        round: raw.round,
        original_team: raw.original_team,
        abbr: TEAM_FULL_TO_ABBR[raw.original_team] ?? raw.original_team,
      };

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, { type, picks: [] });
      }
      groupMap.get(groupKey)!.picks.push(info);
    }
  }

  return Array.from(groupMap.entries())
    .map(([id, g]) => ({
      id,
      type: g.type,
      picks: g.picks.sort((a, b) => a.year - b.year || a.round - b.round || a.abbr.localeCompare(b.abbr)),
    }))
    .sort((a, b) => {
      const typeA = TYPE_ORDER[a.type] ?? 99;
      const typeB = TYPE_ORDER[b.type] ?? 99;
      if (typeA !== typeB) return typeA - typeB;
      const minYearA = Math.min(...a.picks.map(p => p.year));
      const minYearB = Math.min(...b.picks.map(p => p.year));
      if (minYearA !== minYearB) return minYearA - minYearB;
      return a.picks[0].round - b.picks[0].round;
    });
}

export default function DevPage() {
  const groups = loadGroups();
  return <DevAuditClient groups={groups} />;
}
