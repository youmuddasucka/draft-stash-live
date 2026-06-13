// app/about/page.tsx

// Draft-slot value curve (normalized so the #1 pick = 1.0). Mirrors VALUE_CURVE
// in scripts/engine_v2.py, kept here only to draw the chart below.
const VALUE_CURVE: number[] = [
  1.0, 0.84007, 0.7516, 0.6895, 0.64183, 0.60223, 0.56745, 0.53702, 0.50913,
  0.48013, 0.45108, 0.42505, 0.4007, 0.37892, 0.35868, 0.34123, 0.32595,
  0.31275, 0.29943, 0.28758, 0.27428, 0.26237, 0.24967, 0.2383, 0.22705,
  0.21682, 0.20703, 0.19608, 0.18613, 0.17563, 0.15018, 0.14385, 0.13697,
  0.1311, 0.125, 0.11983, 0.11443, 0.1097, 0.10373, 0.0994, 0.0951, 0.09053,
  0.08663, 0.0824, 0.07825, 0.0741, 0.06998, 0.0659, 0.06215, 0.05815,
  0.05445, 0.05108, 0.04745, 0.0435, 0.03955, 0.0369, 0.03333, 0.02947,
  0.02625, 0.02242,
];

const CHART_W = 620;
const CHART_H = 150;
const PAD = 12;
const xFor = (slot: number) => PAD + ((slot - 1) / 59) * (CHART_W - PAD * 2);
const yFor = (v: number) => PAD + (1 - v) * (CHART_H - PAD * 2);

function ValueCurveChart() {
  const line = VALUE_CURVE.map((v, i) => `${xFor(i + 1).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const area = `${PAD},${CHART_H - PAD} ${line} ${(CHART_W - PAD).toFixed(1)},${CHART_H - PAD}`;
  const marks = [1, 14, 30, 45, 60];
  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 22}`} className="w-full" role="img" aria-label="Draft pick value curve">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E6B85C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E6B85C" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* round 1 / round 2 divider */}
      <line x1={xFor(30.5)} y1={PAD} x2={xFor(30.5)} y2={CHART_H - PAD}
        stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      <text x={xFor(15.5)} y={PAD + 8} textAnchor="middle" className="fill-white/30" fontSize="9">1st round</text>
      <text x={xFor(45.5)} y={PAD + 8} textAnchor="middle" className="fill-white/30" fontSize="9">2nd round</text>
      <polygon points={area} fill="url(#curveFill)" />
      <polyline points={line} fill="none" stroke="#E6B85C" strokeWidth="2" />
      {marks.map(slot => (
        <g key={slot}>
          <circle cx={xFor(slot)} cy={yFor(VALUE_CURVE[slot - 1])} r="2.5" fill="#E6B85C" />
          <text x={xFor(slot)} y={CHART_H + 10} textAnchor="middle" className="fill-white/40" fontSize="9">#{slot}</text>
          <text x={xFor(slot)} y={yFor(VALUE_CURVE[slot - 1]) - 6} textAnchor="middle" className="fill-white/70" fontSize="9" fontWeight="700">
            {Math.round(VALUE_CURVE[slot - 1] * 100)}
          </text>
        </g>
      ))}
    </svg>
  );
}

const STATS = [
  { n: "420", l: "picks tracked" },
  { n: "30", l: "teams" },
  { n: "2026–2032", l: "draft years" },
  { n: "100k", l: "simulated drafts" },
];

const WHY = [
  {
    t: "Put a number on every pick",
    d: "Analysts still trade in vague \"firsts\" and \"seconds,\" but the #1 pick is worth orders of magnitude more than pick #30. Draft Stash assigns a concrete expected value to all 420 picks so you can compare them directly.",
  },
  {
    t: "See a team's whole stash",
    d: "Every pick a team controls, whether outright, protected, or tangled in a swap, in one place, with its value and the odds it actually conveys. No more digging through trade language to learn what a team really owns.",
  },
  {
    t: "Reason about protections & swaps",
    d: "Protections, swaps, and backups quietly reshape what a pick is worth. The simulation resolves each one the way the real trade does, so you can see how a top-4 protection or a best-of-three swap changes the math.",
  },
];

const STEPS = [
  {
    t: "Project the board",
    d: "Each draft year starts from projected standings, then the real lottery odds are applied to set the order. Years further out are blended toward random (2026 is essentially settled, 2032 is wide open) to reflect how uncertainty grows with time.",
  },
  {
    t: "Run it 100,000 times",
    d: "A full seven-year draft board (2026–2032) is generated and re-generated 100,000 times, so every pick gets a distribution of outcomes rather than a single guess.",
  },
  {
    t: "Resolve every pick by its real rules",
    d: "In each simulation, all 420 picks are settled exactly as their trades dictate: unprotected conveyances, lottery protections, two- and three-team swaps, conditional backups, and conveyance pools all play out by the letter.",
  },
  {
    t: "Value each landing spot",
    d: "Wherever a pick lands, it's scored on a draft-value curve and discounted for how far in the future it is. Average that realized value over every simulation and you have the pick's expected value.",
  },
  {
    t: "Roll it up",
    d: "Per-pick results aggregate into ownership probabilities, projected slots, and team-level stash totals: the numbers you see across the site.",
  },
];

const GLOSSARY = [
  ["Expected value (EV)", "A pick's average realized value across all 100,000 simulations, scored on the curve below."],
  ["Stash value", "What a pick is worth to a specific team. Conditional picks (protections, backups) are weighted by how often they actually convey; swaps use the value of the pick the team ends up with."],
  ["Projected slot", "The pick's average draft position across simulations. For example, \"7.2\" means it lands around the 7th selection on average."],
  ["Ownership %", "How often each team ends up holding the pick. A pick can have several possible owners when swaps or protections are involved."],
  ["Protection range", "The slots in which a pick stays with its original team. If it lands outside that range, it conveys."],
];

export default function AboutPage() {
  return (
    <div className="glass-bg min-h-screen -mx-4 md:-mx-8 -my-6 px-4 md:px-8 py-10">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* ── LEDE ── */}
        <header className="space-y-5">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold/80 font-semibold">About</span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            Every NBA draft pick,<br />
            <span className="text-gold">priced.</span>
          </h1>
          <p className="text-base md:text-lg opacity-80 leading-relaxed">
            Draft picks are the NBA's closest thing to a currency. Highly divisible and held by every team, they're
            central to almost every deal. Yet they're still valued as vague{" "}
            <em>&ldquo;firsts&rdquo;</em> and <em>&ldquo;seconds.&rdquo;</em>{" "}
            <span className="text-white font-semibold">Draft Stash is a draft-pick valuation database</span>, a
            simplified way to see and value every pick, view exactly what a given team holds, and understand how
            different protections and swap formats change what a pick is actually worth.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {STATS.map(s => (
              <div key={s.l} className="glass-card rounded-xl px-4 py-3 text-center">
                <div className="text-2xl font-black text-gold tabular-nums">{s.n}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-50 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </header>

        {/* ── WHY IT HELPS ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-wide">Why it helps</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {WHY.map(w => (
              <div key={w.t} className="glass-card rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-gold leading-snug">{w.t}</h3>
                <p className="text-xs opacity-70 leading-relaxed">{w.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-wide">How it works</h2>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={s.t} className="glass-card rounded-2xl p-5 flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-black text-sm">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold">{s.t}</h3>
                  <p className="text-xs opacity-70 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── THE MATH ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-wide">The math</h2>

          {/* Value curve */}
          <div className="glass-card rounded-2xl p-5 md:p-6 space-y-3">
            <div>
              <h3 className="text-sm font-bold">The draft-value curve</h3>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Every landing spot is scored on a smooth curve normalized so the #1 pick is worth 100 points. Value
                falls off steeply early and flattens out late: the gap between picks 1 and 5 dwarfs the gap between
                40 and 45. The second round starts a notch below the end of the first.
              </p>
              <p className="text-xs opacity-60 mt-2 leading-relaxed">
                The curve is built from data. We averaged four independent draft-value models, then grounded the result
                in 22 years of real draft outcomes (2003–2024) — scoring every pick by the career production of the
                player actually taken there (Win Shares and value over replacement), with each class measured as a
                share of its own year so old and recent drafts count equally. That&apos;s where the steep early drop
                and long flat tail come from.
              </p>
            </div>
            <ValueCurveChart />
          </div>

          {/* Formula */}
          <div className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Pick value</h3>
              <p className="text-xs opacity-60 leading-relaxed">
                A pick's value in any one simulation is its slot value, scaled to 100, and discounted 2% per year into
                the future (a pick this year is worth more than the same slot four years out):
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs md:text-sm overflow-x-auto">
                <span className="opacity-90">value</span>{" "}
                <span className="opacity-40">=</span>{" "}
                <span className="text-gold">curve</span>(slot){" "}
                <span className="opacity-40">×</span> 100{" "}
                <span className="opacity-40">×</span> 0.98
                <sup>(year&nbsp;−&nbsp;2026)</sup>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold">Expected value</h3>
              <p className="text-xs opacity-60 leading-relaxed">
                Run that over 100,000 simulated drafts and average the value the pick actually delivers to whoever
                ends up owning it:
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs md:text-sm overflow-x-auto">
                <span className="opacity-90">EV</span>{" "}
                <span className="opacity-40">=</span>{" "}
                <span className="opacity-40">(1 / N)</span>{" "}
                <span className="text-gold">Σ</span>{" "}
                value<sub>i</sub>
                <span className="opacity-40">,</span>{" "}
                <span className="opacity-50">N = 100,000</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold">Stash value (to a team)</h3>
              <p className="text-xs opacity-60 leading-relaxed">
                What a pick is worth to a particular team depends on whether it actually lands there. Conditional picks
                are weighted by their convey probability; swaps already resolve to one held pick, so that pick's value
                is used directly:
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs md:text-sm overflow-x-auto space-y-1">
                <div><span className="opacity-50">conditional pick:</span>{" "}stash <span className="opacity-40">=</span> P(convey) <span className="opacity-40">×</span> value<sub>if&nbsp;held</sub></div>
                <div><span className="opacity-50">swap:</span>{" "}stash <span className="opacity-40">=</span> value<sub>pick&nbsp;received</sub></div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold">Uncertainty over time</h3>
              <p className="text-xs opacity-60 leading-relaxed">
                Each year's projected order is blended toward a random one, with the random weight growing linearly
                over a six-year horizon, so near drafts track the projections and distant ones spread out:
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs md:text-sm overflow-x-auto">
                <span className="text-gold">randomness</span>{" "}
                <span className="opacity-40">=</span>{" "}
                (year&nbsp;−&nbsp;2026)&nbsp;/&nbsp;6{" "}
                <span className="opacity-50">(0 in 2026, up to 1 by 2032)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── READING THE NUMBERS ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-wide">Reading the numbers</h2>
          <div className="glass-card rounded-2xl p-5 md:p-6 divide-y divide-white/8">
            {GLOSSARY.map(([term, def]) => (
              <div key={term} className="py-3 first:pt-0 last:pb-0 sm:flex sm:gap-4">
                <div className="text-sm font-bold text-gold sm:w-44 sm:shrink-0">{term}</div>
                <p className="text-xs opacity-70 leading-relaxed mt-1 sm:mt-0">{def}</p>
              </div>
            ))}
          </div>
        </section>

        {/*
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide">What it isn't</h2>
          <div className="glass-card rounded-2xl p-5 md:p-6">
            <p className="text-xs opacity-70 leading-relaxed">
              These are <span className="text-white font-semibold">projections, not predictions</span>. Standings are
              estimates, the lottery is random, and trades can be made at any time. Draft Stash models the structure of
              the picks (protections, swaps, and conveyances) and the odds of where teams land; it does not model
              player evaluation, salary-cap mechanics, or trade eligibility. Treat the values as a consistent yardstick
              for comparing draft capital, not a guarantee of any single outcome.
            </p>
          </div>
        </section>
        */}

      </div>
    </div>
  );
}
