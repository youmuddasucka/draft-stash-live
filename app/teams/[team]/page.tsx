import fs from "fs";
import path from "path";
import TeamLogo from "@/components/TeamLogo";
import { teamColors } from "@/components/teamColors";
import { TEAM_METADATA, TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import { TEAM_EMPLOYEES } from "@/lib/employees";
import { loadSimPickCards } from "@/lib/loadSimPickCards";
import { loadSimTeamPickCards, type SimTeamPickCard } from "@/lib/loadSimTeamPickCards";
import { computeStashRankings } from "@/lib/computeStashRankings";
import TeamPicksSection from "@/components/TeamPicksSection";

const TEAM_FOLDER: Record<string, string> = {
  ATL: "atlanta",      BOS: "boston",       BKN: "brooklyn",
  CHA: "charlotte",    CHI: "chicago",      CLE: "cleveland",
  DAL: "dallas",       DEN: "denver",       DET: "detroit",
  GSW: "golden_state", HOU: "houston",      IND: "indiana",
  LAC: "los_angeles_clippers", LAL: "los_angeles_lakers",
  MEM: "memphis",      MIA: "miami",        MIL: "milwaukee",
  MIN: "minnesota",    NOP: "new_orleans",  NYK: "new_york",
  OKC: "oklahoma_city", ORL: "orlando",    PHI: "philadelphia",
  PHX: "phoenix",      POR: "portland",     SAC: "sacramento",
  SAS: "san_antonio",  TOR: "toronto",      UTA: "utah",
  WAS: "washington",
};

function loadPickSwapId(pickId: string): string | null {
  const m = pickId.match(/^(.+)_\d{4}_[12]$/);
  if (!m) return null;
  const abbr = TEAM_FULL_TO_ABBR[m[1].replace(/_/g, " ")];
  if (!abbr) return null;
  const folder = TEAM_FOLDER[abbr];
  if (!folder) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), "public", "pick-data", "teams", folder, `${pickId}.json`),
      "utf-8"
    ));
    return raw?.rules?.swap_id ?? null;
  } catch { return null; }
}

function dedupeSwaps(cards: SimTeamPickCard[], teamName: string): SimTeamPickCard[] {
  const groupMap = new Map<string, SimTeamPickCard[]>();
  for (const card of cards) {
    const swapId = loadPickSwapId(card.pick_id);
    const key = swapId ?? card.pick_id;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(card);
  }
  const result: SimTeamPickCard[] = [];
  for (const group of groupMap.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const rep =
        group.find(c => c.original_team === teamName) ??
        group.reduce((best, c) => c.conditional_ev > best.conditional_ev ? c : best);
      result.push(rep);
    }
  }
  return result;
}

function loadRawPick(pickId: string): any | null {
  const m = pickId.match(/^(.+)_\d{4}_[12]$/);
  if (!m) return null;
  const abbr = TEAM_FULL_TO_ABBR[m[1].replace(/_/g, " ")];
  if (!abbr) return null;
  const folder = TEAM_FOLDER[abbr];
  if (!folder) return null;
  try {
    return JSON.parse(fs.readFileSync(
      path.join(process.cwd(), "public", "pick-data", "teams", folder, `${pickId}.json`),
      "utf-8"
    ));
  } catch { return null; }
}

function getSwapLabel(pickId: string, teamName: string): string | null {
  const raw = loadRawPick(pickId);
  if (!raw?.rules) return null;
  const alloc: any[] = raw.rules.allocation ?? [];
  if (!alloc.length) return null;
  const entry = alloc.find((a: any) => a.to === teamName);
  if (!entry) return null;
  const rank = Number(entry.rank);

  // Build pool abbreviation list
  const poolEntries: any[] = raw.rules.pool ?? [];
  const poolAbbrs = poolEntries
    .map((e: any) => {
      const pid: string = typeof e === "string" ? e : (e.pick ?? "");
      if (!pid || pid.startsWith("TEMP_")) return null;
      const m = pid.match(/^(.+)_\d{4}_[12]$/);
      if (!m) return null;
      return TEAM_FULL_TO_ABBR[m[1].replace(/_/g, " ")] ?? null;
    })
    .filter(Boolean) as string[];

  const poolStr = poolAbbrs.length ? `(${poolAbbrs.join(", ")})` : "";
  if (rank === 1) return `Best of ${poolStr}`.trim();
  if (rank === alloc.length) return `Worst of ${poolStr}`.trim();
  return `Pick ${rank} of ${poolStr}`.trim();
}

type Props = {
  params: { team: string };
};

const FINISH_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

function rankToColor(rank: number | null): string {
  if (!rank) return "#444";
  const clamped = Math.max(1, Math.min(30, rank));
  const hue = 120 - ((clamped - 1) / 29) * 120;
  return `hsl(${hue}, 65%, 40%)`;
}

// slot 1 = worst pick (red), slot 30 = best pick (green)
function slotToColor(slot: number | null): string {
  if (!slot) return "#444";
  const clamped = Math.max(1, Math.min(30, slot));
  const hue = ((clamped - 1) / 29) * 120;
  return `hsl(${hue}, 65%, 40%)`;
}

export default async function TeamPage({ params }: Props) {
  const { team } = await params;
  const TEAM = team.toUpperCase();

  const teamMeta = TEAM_METADATA[TEAM];
  const teamName = teamMeta?.full ?? TEAM;
  const color = teamColors[TEAM] ?? "#444";

  const staff = TEAM_EMPLOYEES[TEAM];
  const gm = staff?.gm ?? "Unknown";
  const coach = staff?.coach ?? "Unknown";

  const stashRankings = computeStashRankings();
  const stashIndex = stashRankings.findIndex(r => r.team === TEAM);
  const stashRank = stashIndex >= 0 ? stashIndex + 1 : null;
  function ordinalSuffix(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] ?? s[v] ?? s[0];
  }

  /* ============================
     PICKS — new sim data
  ============================ */
  const allPickCards = loadSimPickCards();
  const slotMap: Record<string, number> = {};
  for (const p of allPickCards) {
    slotMap[p.pick_id] = p.expected_slot;
  }

  // Projected finish: average simulated R1 draft slot for this team's own pick each year
  const pickIdBase = teamName.replace(/ /g, "_");
  const projectedFinish = FINISH_YEARS.map(year => ({
    year,
    slot: slotMap[`${pickIdBase}_${year}_1`] ?? null,
  }));

  const allTeamCards = loadSimTeamPickCards();
  const teamCards = dedupeSwaps(allTeamCards.filter(c => c.team === teamName), teamName);

  const r1Cards = teamCards.filter(c => c.round === 1).sort((a, b) => a.year - b.year);
  const r2Cards = teamCards.filter(c => c.round === 2).sort((a, b) => a.year - b.year);

  const swapPositions: Record<string, string> = {};
  for (const card of teamCards) {
    if (card.pick_type.includes("swap")) {
      const label = getSwapLabel(card.pick_id, teamName);
      if (label) swapPositions[card.pick_id] = label;
    }
  }

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* TOP ROW */}
        <div className="flex justify-center">
          <section className="flex items-center gap-10">
            {/* LOGO + INFO */}
            <div className="flex items-center gap-4">
              <TeamLogo abbr={TEAM} size={120} />
              <div>
                <h1 className="text-3xl font-bold">{teamName}</h1>
                <p className="text-xs opacity-70">Executive: {gm}</p>
                <p className="text-xs opacity-70">Coach: {coach}</p>
              </div>
            </div>

            {/* STASH RANK */}
            <div
              className="glass-surface rounded-xl border-2 px-6 py-4 flex flex-col items-center gap-1"
              style={{ borderColor: color }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest opacity-60">Draft Stash Rank</h2>
              <div
                className="text-6xl font-black leading-none tabular-nums"
                style={{ color: rankToColor(stashRank) }}
              >
                {stashRank ?? "–"}
                {stashRank && (
                  <span className="text-2xl font-bold align-super" style={{ color: rankToColor(stashRank) }}>
                    {ordinalSuffix(stashRank)}
                  </span>
                )}
              </div>
            </div>

            {/* PROJECTED FINISH */}
            <div
              className="glass-surface rounded-xl border-2 px-4 py-3 space-y-2"
              style={{ borderColor: color }}
            >
              <h2 className="text-sm font-semibold text-center">Projected Pick</h2>
              <div className="grid grid-flow-col auto-cols-max gap-2">
                {projectedFinish.map(({ year, slot }) => (
                  <div key={year} className="text-center text-[10px]">
                    <div className="opacity-60">{year}</div>
                    <div
                      className="px-1.5 py-0.5 rounded-md text-white font-semibold tabular-nums"
                      style={{ backgroundColor: slotToColor(slot) }}
                    >
                      {slot != null ? slot.toFixed(1) : "–"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* PICKS */}
        <section className="grid md:grid-cols-2 gap-15">
          <div className="glass-card rounded-xl p-6 space-y-3">
            <TeamPicksSection
              title="1st-Round Picks"
              cards={r1Cards}
              slotMap={slotMap}
              swapPositions={swapPositions}
            />
          </div>
          <div className="glass-card rounded-xl p-6 space-y-3">
            <TeamPicksSection
              title="2nd-Round Picks"
              cards={r2Cards}
              slotMap={slotMap}
              swapPositions={swapPositions}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
