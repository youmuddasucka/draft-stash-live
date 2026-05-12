"use client";

import { useState, useEffect } from "react";
import { teamColors } from "@/components/teamColors";

const YEARS = ["y2026", "y2027", "y2028", "y2029", "y2030", "y2031", "y2032"] as const;
type Year = typeof YEARS[number];

const YEAR_LABELS: Record<Year, string> = {
  y2026: "2025–26", y2027: "2026–27", y2028: "2027–28",
  y2029: "2028–29", y2030: "2029–30", y2031: "2030–31", y2032: "2031–32",
};

const TEAM_ABBR_TO_NAME: Record<string, string> = {
  ATL: "Atlanta Hawks",   BOS: "Boston Celtics",    BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets", CHI: "Chicago Bulls",   CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",  DEN: "Denver Nuggets",  DET: "Detroit Pistons",
  GSW: "Golden State Warriors", HOU: "Houston Rockets", IND: "Indiana Pacers",
  LAC: "Los Angeles Clippers",  LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",       MIL: "Milwaukee Bucks",  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans", NYK: "New York Knicks", OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",    PHI: "Philadelphia 76ers", PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers", SAC: "Sacramento Kings", SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors",  UTA: "Utah Jazz",         WAS: "Washington Wizards",
};

const ALL_TEAMS = Object.keys(TEAM_ABBR_TO_NAME).sort();

// rank 0 = best team (most wins), rank 29 = worst (fewest wins / pick 1)
const INITIAL_STANDINGS: Record<Year, string[]> = {
  y2026: ["OKC","HOU","DEN","CLE","DET","LAL","NYK","MIA","TOR","ATL","ORL","SAS","MIN","GSW","PHI","BOS","PHX","LAC","MIL","POR","CHI","MEM","DAL","CHA","NOP","SAC","UTA","IND","BKN","WAS"],
  y2027: ["OKC","HOU","DET","SAS","DEN","CLE","BOS","ATL","IND","TOR","LAL","NYK","MIN","ORL","MIA","PHI","GSW","PHX","POR","NOP","DAL","WAS","CHA","MEM","CHI","UTA","MIL","LAC","SAC","BKN"],
  y2028: ["HOU","DET","OKC","SAS","MIN","LAL","BOS","DEN","IND","ATL","CLE","TOR","ORL","MIA","DAL","LAC","NYK","PHI","POR","WAS","CHA","NOP","GSW","UTA","PHX","CHI","MEM","BKN","MIL","SAC"],
  y2029: ["SAS","OKC","MIN","HOU","DET","LAL","ORL","IND","DEN","BOS","ATL","MIA","CLE","TOR","DAL","PHI","POR","WAS","NOP","CHA","NYK","UTA","LAC","CHI","PHX","GSW","BKN","SAC","MIL","MEM"],
  y2030: ["MIN","LAL","DET","SAS","PHI","HOU","OKC","ORL","DAL","ATL","CLE","IND","DEN","WAS","CHA","TOR","NOP","POR","UTA","CHI","MIA","NYK","BOS","BKN","GSW","SAC","MEM","PHX","MIL","LAC"],
  y2031: ["LAL","SAS","PHI","MIN","DAL","OKC","DET","HOU","IND","WAS","CHA","CLE","ATL","NOP","ORL","UTA","CHI","TOR","BOS","DEN","POR","BKN","GSW","SAC","NYK","PHX","MIA","MIL","MEM","LAC"],
  y2032: ["SAS","DET","PHI","LAL","IND","HOU","DAL","CHA","MIN","OKC","WAS","UTA","CLE","BOS","POR","TOR","NOP","CHI","BKN","ATL","GSW","DEN","SAC","NYK","ORL","MIA","PHX","MEM","MIL","LAC"],
};

function rankStyle(i: number) {
  if (i < 5)  return "text-[#E6B85C] font-bold";
  if (i < 10) return "text-green-400 font-semibold";
  if (i >= 25) return "text-red-400 font-semibold";
  return "opacity-40";
}

export default function EditStandingsPage() {
  const [standings, setStandings] = useState<Record<Year, string[]>>(INITIAL_STANDINGS);
  const [randomTeams, setRandomTeams] = useState<Record<Year, Set<string>>>(
    () => Object.fromEntries(YEARS.map(y => [y, new Set<string>()])) as Record<Year, Set<string>>
  );
  const [drag, setDrag] = useState<{ year: Year; fromIndex: number } | null>(null);
  const [dropAt, setDropAt] = useState<{ year: Year; index: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [randomYear, setRandomYear] = useState<Year>("y2027");

  // Load saved state from files on mount
  useEffect(() => {
    fetch("/relics/projected_standings.json")
      .then(r => r.ok ? r.json() : null)
      .then((data: Array<Record<string, string | number>> | null) => {
        if (!data?.length) return;
        setStandings(
          Object.fromEntries(
            YEARS.map(y => [y, data.map(row => row[y] as string)])
          ) as Record<Year, string[]>
        );
      })
      .catch(() => {});

    fetch("/relics/random_teams.json")
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, string[]>) => {
        const next = Object.fromEntries(YEARS.map(y => [y, new Set<string>()])) as Record<Year, Set<string>>;
        for (const [year, abbrs] of Object.entries(data)) {
          const key = `y${year}` as Year;
          if (next[key]) abbrs.forEach(a => next[key].add(a));
        }
        setRandomTeams(next);
      })
      .catch(() => {});
  }, []);

  const reorder = (year: Year, from: number, to: number) => {
    if (from === to) return;
    setStandings(prev => {
      const col = [...prev[year]];
      const [item] = col.splice(from, 1);
      col.splice(to, 0, item);
      return { ...prev, [year]: col };
    });
    setSaveStatus("idle");
  };

  const toggleRandom = (year: Year, team: string) => {
    setRandomTeams(prev => {
      const s = new Set(prev[year]);
      s.has(team) ? s.delete(team) : s.add(team);
      return { ...prev, [year]: s };
    });
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/save-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standings,
          randomTeams: Object.fromEntries(
            YEARS.map(y => [y.slice(1), [...randomTeams[y]]])
          ),
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-wide text-gold">Edit Standings</h1>
            <p className="text-sm opacity-40 mt-1">
              Drag within a column to reorder · Round 2 mirrors Round 1 automatically
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              saveStatus === "saved"  ? "bg-green-600 text-white" :
              saveStatus === "error"  ? "bg-red-600 text-white" :
              saveStatus === "saving" ? "bg-white/20 text-white cursor-wait" :
              "bg-[#E6B85C] text-black hover:brightness-110"
            }`}
          >
            {saveStatus === "saving" ? "Saving…" :
             saveStatus === "saved"  ? "✓ Saved" :
             saveStatus === "error"  ? "Error – retry?" :
             "Save to CSV"}
          </button>
        </div>

        {/* STANDINGS TABLE */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-4 text-left w-14">
                  <span className="text-[11px] uppercase tracking-widest opacity-30">#</span>
                </th>
                {YEARS.map(year => (
                  <th key={year} className="px-2 py-4 text-center">
                    <div className="text-xs font-semibold text-gold tracking-wide">
                      {YEAR_LABELS[year]}
                    </div>
                    <div className="text-[10px] mt-1 opacity-30">
                      {randomTeams[year].size > 0
                        ? `${randomTeams[year].size} random`
                        : "drag to reorder"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 30 }, (_, i) => (
                <tr
                  key={i}
                  className={`border-b border-white/4 ${i % 2 === 1 ? "bg-white/2" : ""}`}
                >
                  <td className="px-5 py-2.5">
                    <span className={`text-sm tabular-nums ${rankStyle(i)}`}>{i + 1}</span>
                  </td>

                  {YEARS.map(year => {
                    const team = standings[year][i];
                    const isRandom = randomTeams[year].has(team);
                    const isDragging = drag?.year === year && drag.fromIndex === i;
                    const isDropHere = dropAt?.year === year && dropAt.index === i && drag?.year === year;
                    const bg = teamColors[team] || "#333";

                    return (
                      <td
                        key={year}
                        className={`px-2 py-1.5 text-center transition-colors ${isDropHere ? "bg-[#E6B85C]/12" : ""}`}
                        style={isDropHere ? { borderTop: "2px solid #E6B85C88" } : { borderTop: "2px solid transparent" }}
                        onDragOver={e => {
                          if (!drag || drag.year !== year) return;
                          e.preventDefault();
                          if (dropAt?.index !== i || dropAt?.year !== year) {
                            setDropAt({ year, index: i });
                          }
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          if (!drag || drag.year !== year) return;
                          reorder(year, drag.fromIndex, i);
                          setDrag(null);
                          setDropAt(null);
                        }}
                      >
                        <span
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.effectAllowed = "move";
                            setDrag({ year, fromIndex: i });
                          }}
                          onDragEnd={() => {
                            setDrag(null);
                            setDropAt(null);
                          }}
                          className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-bold min-w-11 text-white select-none cursor-grab active:cursor-grabbing transition-opacity ${
                            isDragging ? "opacity-20" : isRandom ? "opacity-45" : ""
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${bg}55 0%, ${bg}22 100%)`,
                            border: isRandom ? `1px dashed ${bg}66` : `1px solid ${bg}99`,
                            boxShadow: isRandom ? "none" : `0 2px 12px ${bg}44, inset 0 1px 0 rgba(255,255,255,0.10)`,
                            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                          }}
                          title={isRandom ? `${TEAM_ABBR_TO_NAME[team]} — marked random` : TEAM_ABBR_TO_NAME[team]}
                        >
                          {isRandom ? `~${team}` : team}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RANDOM TEAMS PANEL */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gold">Random Teams</h2>
              <p className="text-xs opacity-40 mt-1">
                Teams you mark random will be fully shuffled each simulation run —
                useful for years where you can't predict a team's direction
              </p>
            </div>
          </div>

          {/* year tabs */}
          <div className="flex gap-2 flex-wrap">
            {YEARS.map(year => (
              <button
                key={year}
                onClick={() => setRandomYear(year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  randomYear === year
                    ? "bg-[#E6B85C] text-black"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {YEAR_LABELS[year]}
                {randomTeams[year].size > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">({randomTeams[year].size})</span>
                )}
              </button>
            ))}
          </div>

          {/* team grid — click to toggle random */}
          <div className="grid grid-cols-10 gap-2">
            {ALL_TEAMS.map(abbr => {
              const isRandom = randomTeams[randomYear].has(abbr);
              const bg = teamColors[abbr] || "#333";
              return (
                <button
                  key={abbr}
                  onClick={() => toggleRandom(randomYear, abbr)}
                  className={`rounded-lg py-2.5 text-center text-[11px] font-bold transition-all hover:scale-105 ${
                    isRandom ? "" : "opacity-35 hover:opacity-60"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${bg}55 0%, ${bg}22 100%)`,
                    border: isRandom ? `1px solid ${bg}cc` : `1px solid ${bg}44`,
                    boxShadow: isRandom ? `0 0 10px ${bg}55` : "none",
                  }}
                  title={isRandom ? `${TEAM_ABBR_TO_NAME[abbr]} — click to un-randomize` : `${TEAM_ABBR_TO_NAME[abbr]} — click to randomize`}
                >
                  {abbr}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
