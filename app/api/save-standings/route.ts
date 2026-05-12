import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

const TEAM_ABBR_TO_NAME: Record<string, string> = {
  ATL: "Atlanta Hawks",
  BOS: "Boston Celtics",
  BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  DET: "Detroit Pistons",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  IND: "Indiana Pacers",
  LAC: "Los Angeles Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors",
  UTA: "Utah Jazz",
  WAS: "Washington Wizards",
};

type Year = "y2026" | "y2027" | "y2028" | "y2029" | "y2030" | "y2031" | "y2032";
const YEARS: Year[] = ["y2026", "y2027", "y2028", "y2029", "y2030", "y2031", "y2032"];
const YEAR_NUM: Record<Year, number> = {
  y2026: 2026, y2027: 2027, y2028: 2028, y2029: 2029,
  y2030: 2030, y2031: 2031, y2032: 2032,
};

export async function POST(req: NextRequest) {
  try {
    const { standings, randomTeams } = await req.json() as {
      // standings[year][0] = best team (rank 1), [29] = worst (rank 30)
      standings: Record<Year, string[]>;
      // randomTeams["2027"] = ["GSW", "NOP", ...]
      randomTeams: Record<string, string[]>;
    };

    const relicsDir = path.join(process.cwd(), "public", "relics");

    // ── 1. Write future_draft_orders.csv ────────────────────────────────────
    // CSV convention: pick 1 = worst team, pick 30 = best team
    // R2 mirrors R1: pick 31 = same as pick 1, pick 60 = same as pick 30
    const csvLines = ["year,team,pick"];
    for (const yearKey of YEARS) {
      const year = YEAR_NUM[yearKey];
      const teams = standings[yearKey]; // index 0 = best, index 29 = worst
      for (let pick = 1; pick <= 30; pick++) {
        const team = teams[30 - pick]; // pick 1 → index 29 (worst), pick 30 → index 0 (best)
        csvLines.push(`${year},${TEAM_ABBR_TO_NAME[team]},${pick}`);
      }
      for (let pick = 31; pick <= 60; pick++) {
        const team = teams[60 - pick]; // pick 31 → index 29, pick 60 → index 0
        csvLines.push(`${year},${TEAM_ABBR_TO_NAME[team]},${pick}`);
      }
    }
    await writeFile(path.join(relicsDir, "future_draft_orders.csv"), csvLines.join("\n") + "\n");

    // ── 2. Write projected_standings.json (for display page) ────────────────
    const psRows = Array.from({ length: 30 }, (_, i) => {
      const row: Record<string, string | number> = { rank: i + 1 };
      for (const yearKey of YEARS) {
        row[yearKey] = standings[yearKey][i];
      }
      return row;
    });
    await writeFile(
      path.join(relicsDir, "projected_standings.json"),
      JSON.stringify(psRows, null, 2)
    );

    // ── 3. Write random_teams.json ───────────────────────────────────────────
    await writeFile(
      path.join(relicsDir, "random_teams.json"),
      JSON.stringify(randomTeams, null, 2)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
