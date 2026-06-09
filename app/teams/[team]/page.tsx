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
  const rules = loadRawPick(pickId)?.rules;
  if (!rules) return null;
  if (rules.swap_id) return rules.swap_id;
  // Some nested/triple swaps have no swap_id. Synthesize a stable key from the
  // pool composition (shared across all pool members) so they still group and
  // dedupe instead of rendering one card per possible origin pick.
  if (typeof rules.type === "string" && rules.type.includes("swap")) {
    const poolEntries: any[] = Array.isArray(rules.pool)
      ? rules.pool
      : (rules.levels ?? []).flatMap((lvl: any) => lvl.pool ?? []);
    const ids = poolEntries
      .map((e: any) => (typeof e === "string" ? e : e?.pick ?? ""))
      .filter((id: string) => id && !id.startsWith("TEMP_"));
    const uniq = Array.from(new Set(ids)).sort();
    if (uniq.length) return `synthetic_swap:${uniq.join(",")}`;
  }
  return null;
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
      // Pick the card the team most likely actually ends up holding.
      // For a "best of" swap the team rarely keeps its own pick, so selecting
      // by original_team === teamName would surface the near-zero-prob outcome.
      const rep = group.reduce((best, c) => (c.prob ?? 0) > (best.prob ?? 0) ? c : best);
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

// Convert a list of pool pick entries (strings or {pick} objects) into unique
// team abbreviations, preserving order and skipping TEMP_ placeholders.
function poolEntriesToAbbrs(poolEntries: any[]): string[] {
  const abbrs: string[] = [];
  for (const e of poolEntries) {
    const pid: string = typeof e === "string" ? e : (e?.pick ?? "");
    if (!pid || pid.startsWith("TEMP_")) continue;
    const m = pid.match(/^(.+)_\d{4}_[12]$/);
    if (!m) continue;
    const abbr = TEAM_FULL_TO_ABBR[m[1].replace(/_/g, " ")];
    if (abbr && !abbrs.includes(abbr)) abbrs.push(abbr);
  }
  return abbrs;
}

// Gather the swap pool abbreviations for a pick. Handles both top-level
// rules.pool (unpro_swap, pro_swap, pro_triple_swap) and levels-based pools
// (triple_swap, nested_swap), de-duplicated across levels.
function getSwapPoolAbbrs(pickId: string): string[] {
  const raw = loadRawPick(pickId);
  if (!raw?.rules) return [];
  if (Array.isArray(raw.rules.pool)) return poolEntriesToAbbrs(raw.rules.pool);
  const levels: any[] = raw.rules.levels ?? [];
  if (levels.length) {
    const merged = levels.flatMap((lvl: any) => lvl.pool ?? []);
    return poolEntriesToAbbrs(merged);
  }
  return [];
}

// Distinct real (non-TEMP) pool pick ids for a swap, from top-level pool or levels.
function getSwapPoolPickIds(pickId: string): string[] {
  const rules = loadRawPick(pickId)?.rules;
  if (!rules) return [];
  const entries: any[] = Array.isArray(rules.pool)
    ? rules.pool
    : (rules.levels ?? []).flatMap((l: any) => l.pool ?? []);
  const ids = entries
    .map((e: any) => (typeof e === "string" ? e : e?.pick ?? ""))
    .filter((id: string) => id && !id.startsWith("TEMP_"));
  return Array.from(new Set(ids));
}

// A team's position in a swap: rank the recipient teams by the value they
// receive (each recipient's most-likely card's conditional_ev). Best = most
// value, worst = least. Works for any pool size, including nested/triple swaps.
function swapPositionKind(
  poolPickIds: string[],
  teamName: string,
  cards: SimTeamPickCard[]
): "best" | "mid" | "worst" | null {
  const poolSet = new Set(poolPickIds);
  const best = new Map<string, { prob: number; ev: number }>();
  for (const c of cards) {
    if (!poolSet.has(c.pick_id)) continue;
    const cur = best.get(c.team);
    if (!cur || (c.prob ?? 0) > cur.prob) best.set(c.team, { prob: c.prob ?? 0, ev: c.conditional_ev });
  }
  const ranked = [...best.entries()].sort((a, b) => b[1].ev - a[1].ev).map(e => e[0]);
  const idx = ranked.indexOf(teamName);
  if (idx < 0 || ranked.length < 2) return null;
  return idx === 0 ? "best" : idx === ranked.length - 1 ? "worst" : "mid";
}

function getSwapLabel(pickId: string, teamName: string): string | null {
  const raw = loadRawPick(pickId);
  if (!raw?.rules) return null;
  const alloc: any[] = raw.rules.allocation ?? [];
  if (!alloc.length) return null;
  const entry = alloc.find((a: any) => a.to === teamName);
  if (!entry) return null;
  const rank = Number(entry.rank);

  const poolAbbrs = getSwapPoolAbbrs(pickId);
  const poolStr = poolAbbrs.length ? `(${poolAbbrs.join(", ")})` : "";
  if (rank === 1) return `Best of ${poolStr}`.trim();
  if (rank === alloc.length) return `Worst of ${poolStr}`.trim();
  return `Pick ${rank} of ${poolStr}`.trim();
}

type Props = {
  params: { team: string };
};

const FINISH_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
// Drafts at or before this year have already happened — control is decided, so we
// grey those boxes out instead of showing a green/red signal.
const DECIDED_YEAR = 2026;

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
  // Slot 1 is the best pick → green (hue 120); slot 30 is the worst → red (hue 0).
  const hue = ((30 - clamped) / 29) * 120;
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

  // Own first-round pick control: for each year, the likelihood this team ends
  // up holding its OWN R1 pick. A green/red tank signal — controlling your own
  // pick rewards losing, having traded it away removes the incentive.
  const ownPickControl = FINISH_YEARS.map(year => {
    const prob = allTeamCards
      .filter(c => c.team === teamName && c.original_team === teamName && c.round === 1 && c.year === year)
      .reduce((max, c) => Math.max(max, c.prob ?? 0), 0);
    return { year, prob, controls: prob >= 0.5 };
  });

  // Stepien Rule: a team must be guaranteed a first-round pick at least every
  // other year. Only GUARANTEED firsts count — a pick owned outright
  // (unprotected) or a swap (you always receive one). Protected picks (pro_pick)
  // and backups are conditional and can convey away, so they DON'T guarantee a
  // first. A team is "Stepien-maxed" when two consecutive years lack a
  // guaranteed first (it relies on protections resolving its way / can't trade
  // more adjacent firsts).
  const stepienBase = FINISH_YEARS.map(year => {
    const cards = allTeamCards.filter(
      c => c.team === teamName && c.round === 1 && c.year === year && (c.prob ?? 0) > 0.01
    );
    // Count distinct GUARANTEED firsts: owned outright (unprotected) counts per
    // pick; a swap recipient always gets exactly one, so all swaps that year = 1.
    const unprotectedIds = new Set(
      cards.filter(c => c.pick_type === "unprotected" && (c.prob ?? 0) >= 0.999).map(c => c.pick_id)
    );
    const guaranteedCount = unprotectedIds.size + (cards.some(c => c.pick_type.includes("swap")) ? 1 : 0);
    const status: "guaranteed" | "protected" | "none" =
      guaranteedCount > 0 ? "guaranteed" : cards.length > 0 ? "protected" : "none";
    return { year, status, guaranteedCount };
  });

  // A guaranteed first is TRADEABLE only if moving it can't create two
  // consecutive years without a guaranteed pick. So it's LOCKED when an adjacent
  // year isn't guaranteed (protected/none) — unless this year has a spare
  // guaranteed pick (count >= 2), in which case one can still be traded.
  const stepienYears = stepienBase.map((s, i) => {
    if (s.status !== "guaranteed") return { ...s, locked: false, tradeable: false };
    const prevGap = i > 0 && stepienBase[i - 1].status !== "guaranteed";
    const nextGap = i < stepienBase.length - 1 && stepienBase[i + 1].status !== "guaranteed";
    const locked = s.guaranteedCount < 2 && (prevGap || nextGap);
    return { ...s, locked, tradeable: !locked };
  });

  const teamCards = dedupeSwaps(allTeamCards.filter(c => c.team === teamName), teamName);

  const r1Cards = teamCards.filter(c => c.round === 1).sort((a, b) => a.year - b.year);
  const r2Cards = teamCards.filter(c => c.round === 2).sort((a, b) => a.year - b.year);

  const swapPositions: Record<string, string> = {};
  const swapTitles: Record<string, string> = {};
  const swapPos: Record<string, "best" | "mid" | "worst"> = {};
  const swapLogos: Record<string, string[]> = {};
  const pickTypeLabels: Record<string, string> = {};
  for (const card of teamCards) {
    if (card.pick_type.includes("swap")) {
      const label = getSwapLabel(card.pick_id, teamName);
      if (label) swapPositions[card.pick_id] = label;
      const poolAbbrs = getSwapPoolAbbrs(card.pick_id);
      if (poolAbbrs.length >= 2) swapLogos[card.pick_id] = poolAbbrs;
      // Swaps with no resolvable position label (nested/triple swaps, whose
      // allocation lives under levels[]) get a neutral pool title instead of
      // the misleading "Own pick" / "From X" fallback, plus a best/mid/worst
      // pill derived from where this team ranks among the swap's recipients.
      if (!label && poolAbbrs.length >= 2) {
        swapTitles[card.pick_id] = `Swap (${poolAbbrs.join("/")})`;
        const pos = swapPositionKind(getSwapPoolPickIds(card.pick_id), teamName, allTeamCards);
        if (pos) swapPos[card.pick_id] = pos;
      }
    }
    if (card.pick_type === "pro_pick") {
      // Two pro_pick schema variants: protection_range, or condition.range.
      const rules = loadRawPick(card.pick_id)?.rules;
      const pr = rules?.protection_range ?? rules?.condition?.range;
      if (Array.isArray(pr) && pr.length === 2) {
        pickTypeLabels[card.pick_id] = `protected (${pr[0]}-${pr[1]})`;
      }
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

        {/* STEPIEN + OWN PICK CONTROL */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* STEPIEN CHECKER */}
          <div
            className="glass-surface rounded-xl border-2 px-6 py-4 space-y-3"
            style={{ borderColor: color }}
          >
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest opacity-60">Stepien Checker</h2>
              <p className="text-[11px] opacity-50">Which 1st-round picks can still be traded.</p>
            </div>
            <div className="grid grid-flow-col auto-cols-max gap-2 justify-center">
              {stepienYears.map(({ year, status, locked }) => {
                const kind = status === "none" ? "none" : status === "protected" ? "protected" : locked ? "locked" : "tradeable";
                const bg = kind === "tradeable" ? "#16a34a" : kind === "locked" ? "#64748b" : kind === "protected" ? "#d97706" : "#dc2626";
                const glyph = kind === "tradeable" ? "✓" : kind === "locked" ? "🔒" : kind === "protected" ? "P" : "✗";
                const tip = kind === "tradeable" ? "Guaranteed 1st — tradeable"
                  : kind === "locked" ? "Guaranteed, but Stepien-locked by an adjacent year"
                  : kind === "protected" ? "Protected — may convey away (not guaranteed)"
                  : "No 1st-round pick";
                return (
                  <div key={year} className="text-center text-[10px]">
                    <div className="opacity-60 mb-1">{year}</div>
                    <div
                      title={tip}
                      className="w-8 h-8 rounded-md flex items-center justify-center font-black text-white text-xs"
                      style={{ backgroundColor: bg }}
                    >
                      {glyph}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] opacity-60">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#16a34a" }} />Tradeable</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#64748b" }} />Locked</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#d97706" }} />Protected</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#dc2626" }} />None</span>
            </div>
          </div>

          {/* OWN FIRST-ROUND PICK CONTROL */}
          <div
            className="glass-surface rounded-xl border-2 px-6 py-4 space-y-3"
            style={{ borderColor: color }}
          >
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest opacity-60">Own 1st-Round Control</h2>
              <p className="text-[11px] opacity-50">Does {teamMeta?.city ?? TEAM} hold its own 1st that year?</p>
            </div>
            <div className="grid grid-flow-col auto-cols-max gap-2 justify-center">
              {ownPickControl.map(({ year, prob, controls }) => {
                const decided = year <= DECIDED_YEAR;
                return (
                  <div key={year} className="text-center text-[10px]">
                    <div className={`mb-1 ${decided ? "opacity-30" : "opacity-60"}`}>{year}</div>
                    <div
                      title={decided ? `${year} draft — already decided` : `${Math.round(prob * 100)}% likely to keep own 1st`}
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-sm ${decided ? "text-white/40" : "text-white"}`}
                      style={{ backgroundColor: decided ? "#3f3f46" : controls ? "#16a34a" : "#dc2626" }}
                    >
                      {decided ? "–" : controls ? "✓" : "✗"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PICKS */}
        <section className="grid md:grid-cols-2 gap-15">
          <div className="glass-card rounded-xl p-6 space-y-3">
            <TeamPicksSection
              title="1st-Round Picks"
              cards={r1Cards}
              slotMap={slotMap}
              swapPositions={swapPositions}
              swapTitles={swapTitles}
              swapPos={swapPos}
              swapLogos={swapLogos}
              pickTypeLabels={pickTypeLabels}
            />
          </div>
          <div className="glass-card rounded-xl p-6 space-y-3">
            <TeamPicksSection
              title="2nd-Round Picks"
              cards={r2Cards}
              slotMap={slotMap}
              swapPositions={swapPositions}
              swapTitles={swapTitles}
              swapPos={swapPos}
              swapLogos={swapLogos}
              pickTypeLabels={pickTypeLabels}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
