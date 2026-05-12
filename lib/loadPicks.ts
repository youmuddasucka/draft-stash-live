import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { TEAM_METADATA } from "@/lib/teamMetadata";

/* ============================
   TYPES
============================ */

export type PickRuleAllocation = {
  rank: "mf" | "lf";
  to: string;
};

export type PickRules = {
  type: string;
  possible_destinations?: string[];
  pool?: string[];
  allocation?: PickRuleAllocation[];
  // For nested swaps
  levels?: Array<{
    description: string;
    allocation: PickRuleAllocation[];
  }>;
};

export type PickRow = {
  pick_id: string;
  year: number;
  round: number;
  original_team: string;
  pick_type: string;
  rules?: string;

  EV: number;
  value_std: number;
  min_value: number;
  max_value: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;

  expected_draft_slot: number;
  resolution_rate: number;

  owner_1?: string;
  owner_2?: string;
  owner_3?: string;

  ownership_prob_1?: number;
  ownership_prob_2?: number;
  ownership_prob_3?: number;
};

export type Pick = Omit<PickRow, 'rules'> & {
  rules?: PickRules;
  original_team_abbr: string;
  owner_1_abbr?: string;
  owner_2_abbr?: string;
  owner_3_abbr?: string;
};

/* ============================
   HELPERS
============================ */

const TEAM_FULL_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_METADATA).map(([abbr, meta]) => [meta.full, abbr])
);

const r1 = (v: number) => (typeof v === 'number' ? Math.round(v * 10) / 10 : 0);

/* ============================
   LOADER
============================ */

export function loadPicks(): Pick[] {
  const filePath = path.join(process.cwd(), "data/picks/master_picks.csv");
  const csv = fs.readFileSync(filePath, "utf8");

  const { data } = Papa.parse<PickRow>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  return data.map((row): Pick => {
    let parsedRules: PickRules | undefined;

    if (row.rules && typeof row.rules === 'string') {
      try {
        // Clean double-double quotes common in Python-to-CSV exports
        const cleanJson = row.rules.trim().replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"');
        parsedRules = JSON.parse(cleanJson);
      } catch (e) {
        console.error(`Error parsing JSON for ${row.pick_id}:`, e);
      }
    }

    return {
      ...row,
      rules: parsedRules,
      EV: r1(row.EV * 100),
      value_std: r1(row.value_std),
      min_value: r1(row.min_value),
      max_value: r1(row.max_value),
      p10: r1(row.p10),
      p25: r1(row.p25),
      p50: r1(row.p50),
      p75: r1(row.p75),
      p90: r1(row.p90),
      expected_draft_slot: r1(row.expected_draft_slot),
      original_team_abbr: TEAM_FULL_TO_ABBR[row.original_team] ?? row.original_team,
      owner_1_abbr: row.owner_1 ? TEAM_FULL_TO_ABBR[row.owner_1] ?? row.owner_1 : undefined,
      owner_2_abbr: row.owner_2 ? TEAM_FULL_TO_ABBR[row.owner_2] ?? row.owner_2 : undefined,
      owner_3_abbr: row.owner_3 ? TEAM_FULL_TO_ABBR[row.owner_3] ?? row.owner_3 : undefined,
    };
  });
}