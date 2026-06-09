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
    <div className="glass-bg min-h-screen text-white px-4 py-6 md:px-6 md:py-10">
      <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-[2fr_3fr_2fr] items-start">

        {/* LEFT — TOP STASHES */}
        <div className="order-2 md:order-0 glass-card rounded-2xl p-5 h-[440px] md:h-[700px] flex flex-col gap-3">
          <div className="shrink-0 pb-1 border-b border-white/6">
            <h2 className="text-base font-black tracking-[0.12em] uppercase text-center text-gold">Top Stashes</h2>
          </div>
          <div className="space-y-0.5 overflow-y-auto">
            {stashRankings.map((row, i) => {
              const color = teamColors[row.team] ?? "#888";
              return (
                <a
                  key={row.team}
                  href={`/teams/${row.team.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#E6B85C]/5 hover:border-[#E6B85C]/10 border border-transparent transition-all"
                  style={{ borderLeft: `2px solid ${color}30` }}
                >
                  <span className="text-xs opacity-25 w-4 shrink-0 tabular-nums font-mono">{i + 1}</span>
                  <TeamLogo abbr={row.team} size={32} />
                  <span className="text-sm font-semibold flex-1">{row.team}</span>
                  <span className="text-xs font-mono text-[#A8A9AD] opacity-60 tabular-nums">{row.score.toFixed(1)}</span>
                  <span className="text-white/15 text-xs group-hover:text-[#E6B85C]/40 transition-colors">→</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* CENTER — HERO + ALL TEAMS */}
        <div className="order-1 md:order-0 flex flex-col items-center gap-5">

          {/* Hero panel */}
          <div className="glass-card rounded-2xl px-6 py-5 flex flex-col items-center gap-2 w-full">
            <h1 className="text-[2.2rem] font-black tracking-[0.1em] text-gold leading-none">DRAFT STASH</h1>
            <div className="relative my-1">
              <div className="absolute inset-0 rounded-full blur-2xl scale-150" style={{ background: "radial-gradient(circle, rgba(230,184,92,0.22) 0%, transparent 70%)" }} />
              <img src="/logo.png" alt="Draft Stash" width={160} height={160} className="relative z-10 opacity-88" />
            </div>
            <p className="text-[10px] font-black tracking-[0.25em] uppercase text-[#A8A9AD] opacity-45">2026 Draft Intelligence</p>
          </div>

          {/* All Teams */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(230,184,92,0.25))" }} />
              <span className="text-[9px] font-black tracking-[0.25em] uppercase text-gold opacity-55">All Teams</span>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(230,184,92,0.25))" }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="glass-card rounded-xl p-3 space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-center text-[#A8A9AD] opacity-45">West</h3>
                <div className="grid grid-cols-5 md:grid-cols-3 gap-1.5">
                  {westTeams.map(abbr => (
                    <a
                      key={abbr}
                      href={`/teams/${abbr.toLowerCase()}`}
                      className="team-tile rounded-lg relative overflow-hidden aspect-square"
                    >
                      <img src={teamLogos[abbr]} alt={abbr} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="team-abbr-center absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-[0.15em]" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>{abbr}</div>
                    </a>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-3 space-y-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-center text-[#A8A9AD] opacity-45">East</h3>
                <div className="grid grid-cols-5 md:grid-cols-3 gap-1.5">
                  {eastTeams.map(abbr => (
                    <a
                      key={abbr}
                      href={`/teams/${abbr.toLowerCase()}`}
                      className="team-tile rounded-lg relative overflow-hidden aspect-square"
                    >
                      <img src={teamLogos[abbr]} alt={abbr} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="team-abbr-center absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-[0.15em]" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>{abbr}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — TOP PICKS */}
        <div className="order-3 md:order-0 glass-card rounded-2xl p-5 h-[440px] md:h-[700px] flex flex-col gap-3">
          <div className="shrink-0 pb-1 border-b border-white/6">
            <h2 className="text-base font-black tracking-[0.12em] uppercase text-center text-gold">Top Picks</h2>
          </div>
          <div className="space-y-0.5 overflow-y-auto">
            {topPicks.map((row, i) => {
              const { bg, text } = evStyles(row.ev, row.round);
              const color = teamColors[row.ownerAbbr] ?? "#888";
              return (
                <a
                  key={i}
                  href={`/picks/${row.year}/${row.round}/${row.originAbbr.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#E6B85C]/5 border border-transparent transition-all"
                  style={{ borderLeft: `2px solid ${color}30` }}
                >
                  <span className="text-xs opacity-25 w-4 shrink-0 tabular-nums font-mono">{i + 1}</span>
                  <TeamLogo abbr={row.ownerAbbr} size={32} />
                  <div className="flex flex-col leading-tight flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate">{row.label}</span>
                    <span className="text-[10px] text-[#A8A9AD] opacity-50">{row.year} · R{row.round}</span>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded tabular-nums shrink-0 ${bg} ${text}`}>
                    {row.ev.toFixed(1)}
                  </span>
                  <span className="text-white/15 text-xs group-hover:text-[#E6B85C]/40 transition-colors">→</span>
                </a>
              );
            })}
          </div>
        </div>

      </section>
    </div>
  );
}
