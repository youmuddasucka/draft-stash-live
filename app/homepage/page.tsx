import TeamLogo from "@/components/TeamLogo";
import { computeStashRankings } from "@/lib/computeStashRankings";
import { loadSimPickCards } from "@/lib/loadSimPickCards";
import { TEAM_FULL_TO_ABBR } from "@/lib/teamMetadata";
import { teamLogos } from "@/lib/teamLogos";
import { teamColors } from "@/components/teamColors";
import { evStyles } from "@/lib/picks/evColor";

export default function DraftStashPage() {
  const westTeams = ["DAL","DEN","GSW","HOU","LAC","LAL","MEM","MIN","NOP","OKC","PHX","POR","SAC","SAS","UTA"];
  const eastTeams = ["ATL","BOS","BKN","CHA","CHI","CLE","DET","IND","MIA","MIL","NYK","ORL","PHI","TOR","WAS"];

  const stashRankings = computeStashRankings();

  const allPicks = loadSimPickCards();
  const topPicks = [...allPicks]
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 30)
    .map(p => {
      const primaryOwner = p.ownership[0];
      const ownerFull = primaryOwner?.team ?? p.original_team;
      const ownerAbbr = TEAM_FULL_TO_ABBR[ownerFull] ?? ownerFull;
      const isOwnPick = ownerFull === p.original_team;
      const originAbbr = TEAM_FULL_TO_ABBR[p.original_team] ?? p.original_team;

      let label: string;
      if (p.ownership.length > 1) {
        const topTwo = p.ownership
          .filter(o => o.prob > 0.01)
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 2)
          .map(o => TEAM_FULL_TO_ABBR[o.team] ?? o.team);
        label = topTwo.join(" / ");
      } else if (isOwnPick) {
        label = "Own pick";
      } else {
        label = `via ${originAbbr}`;
      }

      return { label, ownerAbbr, originAbbr, year: p.year, round: p.round, ev: p.ev, isMulti: p.ownership.length > 1 };
    });

  return (
    <div className="glass-bg min-h-screen text-white px-6 py-10">
      <section className="grid gap-6 grid-cols-[2fr_3fr_2fr] items-start">

        {/* LEFT — TOP STASHES */}
        <div className="glass-card rounded-xl p-5 h-[650px] flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center text-gold shrink-0">Top Stashes</h2>
          <div className="space-y-2 overflow-y-auto pr-1">
            {stashRankings.map((row, i) => {
              const color = teamColors[row.team] ?? "#888";
              return (
                <a
                  key={row.team}
                  href={`/teams/${row.team.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/6 transition-colors"
                  style={{ borderLeft: `3px solid ${color}40` }}
                >
                  <span className="text-sm opacity-30 w-5 shrink-0 tabular-nums">{i + 1}</span>
                  <TeamLogo abbr={row.team} size={36} />
                  <span className="text-base font-semibold flex-1">{row.team}</span>
                  <span className="text-sm font-mono opacity-40 tabular-nums">{row.score.toFixed(1)}</span>
                  <span className="text-white/20 text-sm group-hover:text-white/50 transition-colors">→</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* CENTER — HEADER + ALL TEAMS */}
        <div className="rounded-xl p-6 space-y-6 relative flex flex-col items-center">
          <div className="flex flex-col items-center space-y-3">
            <h1 className="text-4xl font-bold tracking-wide text-gold">DRAFT STASH</h1>
            <img src="/logo.png" alt="Banner Logo" width={200} height={200} className="opacity-80" />
            <h2 className="text-3xl font-semibold text-gold">All Teams</h2>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="glass-card rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold uppercase opacity-70 text-center text-gold">West</h3>
              <div className="grid grid-cols-3 gap-2">
                {westTeams.map(abbr => (
                  <a
                    key={abbr}
                    href={`/teams/${abbr.toLowerCase()}`}
                    className="team-tile rounded-xl relative overflow-hidden aspect-square"
                    style={{ "--team-color": teamColors[abbr] || "#ffffff" } as React.CSSProperties}
                  >
                    <img src={teamLogos[abbr]} alt={abbr} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="team-abbr-bottom absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-black tracking-widest text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,1)" }}>{abbr}</div>
                    <div className="team-abbr-center absolute inset-0 flex items-center justify-center text-sm font-black tracking-[0.18em] text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,1)" }}>{abbr}</div>
                  </a>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold uppercase opacity-70 text-center text-gold">East</h3>
              <div className="grid grid-cols-3 gap-2">
                {eastTeams.map(abbr => (
                  <a
                    key={abbr}
                    href={`/teams/${abbr.toLowerCase()}`}
                    className="team-tile rounded-xl relative overflow-hidden aspect-square"
                    style={{ "--team-color": teamColors[abbr] || "#ffffff" } as React.CSSProperties}
                  >
                    <img src={teamLogos[abbr]} alt={abbr} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="team-abbr-bottom absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-black tracking-widest text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,1)" }}>{abbr}</div>
                    <div className="team-abbr-center absolute inset-0 flex items-center justify-center text-sm font-black tracking-[0.18em] text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,1)" }}>{abbr}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — TOP PICKS */}
        <div className="glass-card rounded-xl p-5 h-[650px] flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center text-gold shrink-0">Top Picks</h2>
          <div className="space-y-2 overflow-y-auto pr-1">
            {topPicks.map((row, i) => {
              const { bg, text } = evStyles(row.ev, row.round);
              const color = teamColors[row.ownerAbbr] ?? "#888";
              return (
                <a
                  key={i}
                  href={`/picks/${row.year}/${row.round}/${row.originAbbr.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/6 transition-colors"
                  style={{ borderLeft: `3px solid ${color}40` }}
                >
                  <span className="text-sm opacity-30 w-5 shrink-0 tabular-nums">{i + 1}</span>
                  <TeamLogo abbr={row.ownerAbbr} size={36} />
                  <div className="flex flex-col leading-tight flex-1 min-w-0">
                    <span className="text-base font-semibold truncate">{row.label}</span>
                    <span className="text-xs opacity-40">{row.year} · R{row.round}</span>
                  </div>
                  <span className={`text-sm font-black px-2 py-1 rounded tabular-nums shrink-0 ${bg} ${text}`}>
                    {row.ev.toFixed(1)}
                  </span>
                  <span className="text-white/20 text-sm group-hover:text-white/50 transition-colors">→</span>
                </a>
              );
            })}
          </div>
        </div>

      </section>
    </div>
  );
}
