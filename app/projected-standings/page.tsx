import { readFileSync } from "fs";
import path from "path";
import Link from "next/link";
import { teamColors } from "@/components/teamColors";

export const dynamic = "force-dynamic";

interface StandingRow {
  rank: number;
  y2026: string; y2027: string; y2028: string; y2029: string;
  y2030: string; y2031: string; y2032: string;
}

const FALLBACK: StandingRow[] = [
  { rank: 1,  y2026: "OKC", y2027: "OKC", y2028: "HOU", y2029: "SAS", y2030: "MIN", y2031: "LAL", y2032: "SAS" },
  { rank: 2,  y2026: "HOU", y2027: "HOU", y2028: "DET", y2029: "OKC", y2030: "LAL", y2031: "SAS", y2032: "DET" },
  { rank: 3,  y2026: "DEN", y2027: "DET", y2028: "OKC", y2029: "MIN", y2030: "DET", y2031: "PHI", y2032: "PHI" },
  { rank: 4,  y2026: "CLE", y2027: "SAS", y2028: "SAS", y2029: "HOU", y2030: "SAS", y2031: "MIN", y2032: "LAL" },
  { rank: 5,  y2026: "DET", y2027: "DEN", y2028: "MIN", y2029: "DET", y2030: "PHI", y2031: "DAL", y2032: "IND" },
  { rank: 6,  y2026: "LAL", y2027: "CLE", y2028: "LAL", y2029: "LAL", y2030: "HOU", y2031: "OKC", y2032: "HOU" },
  { rank: 7,  y2026: "NYK", y2027: "BOS", y2028: "BOS", y2029: "ORL", y2030: "OKC", y2031: "DET", y2032: "DAL" },
  { rank: 8,  y2026: "MIA", y2027: "ATL", y2028: "DEN", y2029: "IND", y2030: "ORL", y2031: "HOU", y2032: "CHA" },
  { rank: 9,  y2026: "TOR", y2027: "IND", y2028: "IND", y2029: "DEN", y2030: "DAL", y2031: "IND", y2032: "MIN" },
  { rank: 10, y2026: "ATL", y2027: "TOR", y2028: "ATL", y2029: "BOS", y2030: "ATL", y2031: "WAS", y2032: "OKC" },
  { rank: 11, y2026: "ORL", y2027: "LAL", y2028: "CLE", y2029: "ATL", y2030: "CLE", y2031: "CHA", y2032: "WAS" },
  { rank: 12, y2026: "SAS", y2027: "NYK", y2028: "TOR", y2029: "MIA", y2030: "IND", y2031: "CLE", y2032: "UTA" },
  { rank: 13, y2026: "MIN", y2027: "MIN", y2028: "ORL", y2029: "CLE", y2030: "DEN", y2031: "ATL", y2032: "CLE" },
  { rank: 14, y2026: "GSW", y2027: "ORL", y2028: "MIA", y2029: "TOR", y2030: "WAS", y2031: "NOP", y2032: "BOS" },
  { rank: 15, y2026: "PHI", y2027: "MIA", y2028: "DAL", y2029: "DAL", y2030: "CHA", y2031: "ORL", y2032: "POR" },
  { rank: 16, y2026: "BOS", y2027: "PHI", y2028: "LAC", y2029: "PHI", y2030: "TOR", y2031: "UTA", y2032: "TOR" },
  { rank: 17, y2026: "PHX", y2027: "GSW", y2028: "NYK", y2029: "POR", y2030: "NOP", y2031: "CHI", y2032: "NOP" },
  { rank: 18, y2026: "LAC", y2027: "PHX", y2028: "PHI", y2029: "WAS", y2030: "POR", y2031: "TOR", y2032: "CHI" },
  { rank: 19, y2026: "MIL", y2027: "POR", y2028: "POR", y2029: "NOP", y2030: "UTA", y2031: "BOS", y2032: "BKN" },
  { rank: 20, y2026: "POR", y2027: "NOP", y2028: "WAS", y2029: "CHA", y2030: "CHI", y2031: "DEN", y2032: "ATL" },
  { rank: 21, y2026: "CHI", y2027: "DAL", y2028: "CHA", y2029: "NYK", y2030: "MIA", y2031: "POR", y2032: "GSW" },
  { rank: 22, y2026: "MEM", y2027: "WAS", y2028: "NOP", y2029: "UTA", y2030: "NYK", y2031: "BKN", y2032: "DEN" },
  { rank: 23, y2026: "DAL", y2027: "CHA", y2028: "GSW", y2029: "LAC", y2030: "BOS", y2031: "GSW", y2032: "SAC" },
  { rank: 24, y2026: "CHA", y2027: "MEM", y2028: "UTA", y2029: "CHI", y2030: "BKN", y2031: "SAC", y2032: "NYK" },
  { rank: 25, y2026: "NOP", y2027: "CHI", y2028: "PHX", y2029: "PHX", y2030: "GSW", y2031: "NYK", y2032: "ORL" },
  { rank: 26, y2026: "SAC", y2027: "UTA", y2028: "CHI", y2029: "GSW", y2030: "SAC", y2031: "PHX", y2032: "MIA" },
  { rank: 27, y2026: "UTA", y2027: "MIL", y2028: "MEM", y2029: "BKN", y2030: "MEM", y2031: "MIA", y2032: "PHX" },
  { rank: 28, y2026: "IND", y2027: "LAC", y2028: "BKN", y2029: "SAC", y2030: "PHX", y2031: "MIL", y2032: "MEM" },
  { rank: 29, y2026: "BKN", y2027: "SAC", y2028: "MIL", y2029: "MIL", y2030: "MIL", y2031: "MEM", y2032: "MIL" },
  { rank: 30, y2026: "WAS", y2027: "BKN", y2028: "SAC", y2029: "MEM", y2030: "LAC", y2031: "LAC", y2032: "LAC" },
];

function loadStandings(): StandingRow[] {
  try {
    const p = path.join(process.cwd(), "public", "relics", "projected_standings.json");
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return FALLBACK;
  }
}

const columns = [
  { label: "2025–26", key: "y2026", weight: 0 },
  { label: "2026–27", key: "y2027", weight: 15 },
  { label: "2027–28", key: "y2028", weight: 30 },
  { label: "2028–29", key: "y2029", weight: 45 },
  { label: "2029–30", key: "y2030", weight: 60 },
  { label: "2030–31", key: "y2031", weight: 90 },
  { label: "2031–32", key: "y2032", weight: 95 },
];

function rankStyle(rank: number): string {
  if (rank <= 5)  return "text-[#E6B85C] font-bold";
  if (rank <= 10) return "text-green-400 font-semibold";
  if (rank >= 26) return "text-red-400 font-semibold";
  return "opacity-40";
}

export default function ProjectedStandingsPage() {
  const standings = loadStandings();

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-wide text-gold">
            Projected Standings
          </h1>
          <p className="text-sm opacity-40">
            Simulated win-loss rankings across 7 seasons — randomness weight increases each year
          </p>
          <Link
            href="/edit-standings"
            className="inline-block text-xs opacity-40 hover:opacity-80 transition-opacity border border-white/10 rounded-lg px-3 py-1"
          >
            Edit →
          </Link>
        </div>

        {/* TABLE */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-4 text-left w-14">
                  <span className="text-[11px] uppercase tracking-widest opacity-30">#</span>
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="px-2 py-4 text-center">
                    <div className="text-xs font-semibold text-gold tracking-wide">
                      {col.label}
                    </div>
                    <div className="text-[10px] opacity-30 mt-1">
                      {col.weight}% random
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr
                  key={row.rank}
                  className={`
                    border-b border-white/4
                    hover:bg-white/4
                    transition-colors duration-100
                    ${i % 2 === 1 ? "bg-white/2" : ""}
                  `}
                >
                  <td className="px-5 py-2.5">
                    <span className={`text-sm tabular-nums ${rankStyle(row.rank)}`}>
                      {row.rank}
                    </span>
                  </td>

                  {columns.map((col) => {
                    const team = row[col.key as keyof typeof row] as string;
                    const bg = teamColors[team] || "#333";
                    return (
                      <td key={col.key} className="px-2 py-2 text-center">
                        <span
                          className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-bold min-w-11 text-white"
                          style={{
                            background: `linear-gradient(135deg, ${bg}55 0%, ${bg}22 100%)`,
                            border: `1px solid ${bg}99`,
                            boxShadow: `0 2px 12px ${bg}44, inset 0 1px 0 rgba(255,255,255,0.10)`,
                            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                          }}
                        >
                          {team}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
