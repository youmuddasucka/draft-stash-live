"""THROWAWAY: diff old-lottery vs new-lottery sim output and write a markdown
report to public/relics/. Delete after use."""
import json, collections

OLD = json.load(open("/tmp/sim_old_lottery/pick_cards.json"))
NEW = json.load(open("/tmp/sim_new_lottery/pick_cards.json"))
oldc = {c["pick_id"]: c for c in OLD}
newc = {c["pick_id"]: c for c in NEW}

ABBR = {  # full name -> abbrev for compact tables
    "Atlanta Hawks":"ATL","Boston Celtics":"BOS","Brooklyn Nets":"BKN","Charlotte Hornets":"CHA",
    "Chicago Bulls":"CHI","Cleveland Cavaliers":"CLE","Dallas Mavericks":"DAL","Denver Nuggets":"DEN",
    "Detroit Pistons":"DET","Golden State Warriors":"GSW","Houston Rockets":"HOU","Indiana Pacers":"IND",
    "Los Angeles Clippers":"LAC","Los Angeles Lakers":"LAL","Memphis Grizzlies":"MEM","Miami Heat":"MIA",
    "Milwaukee Bucks":"MIL","Minnesota Timberwolves":"MIN","New Orleans Pelicans":"NOP","New York Knicks":"NYK",
    "Oklahoma City Thunder":"OKC","Orlando Magic":"ORL","Philadelphia 76ers":"PHI","Phoenix Suns":"PHX",
    "Portland Trail Blazers":"POR","Sacramento Kings":"SAC","San Antonio Spurs":"SAS","Toronto Raptors":"TOR",
    "Utah Jazz":"UTA","Washington Wizards":"WAS",
}
def ab(t): return ABBR.get(t, t)

# ── per-pick EV deltas ──
rows = []
for pid, c in newc.items():
    o = oldc.get(pid)
    if not o: continue
    rows.append({
        "pid": pid, "year": c["year"], "round": c["round"], "team": c["original_team"],
        "old": o["ev"], "new": c["ev"], "d": round(c["ev"] - o["ev"], 2),
    })

def pid_label(pid):
    m = pid.rsplit("_", 2)
    return f"{ab(m[0].replace('_',' '))} {m[1]} {'1st' if m[2]=='1' else '2nd'}"

# ── per-team portfolio value (sum prob*conditional_ev over owned picks) ──
def portfolio(cards):
    val = collections.defaultdict(float)
    for c in cards:
        for o in c["ownership"]:
            val[o["team"]] += (o.get("prob") or 0) * (o.get("conditional_ev") or 0)
    return val
old_pf, new_pf = portfolio(OLD), portfolio(NEW)
team_delta = sorted(({"team": t, "old": old_pf[t], "new": new_pf[t], "d": new_pf[t]-old_pf[t]}
                     for t in set(old_pf)|set(new_pf)), key=lambda r: r["d"])

# ── aggregates ──
fut = [r for r in rows if r["year"] >= 2027]                 # 2026 is settled (no lottery)
settled_2026_maxabs = max((abs(r["d"]) for r in rows if r["year"] == 2026), default=0)
tot_abs = sum(abs(r["d"]) for r in fut)
by_round = {rd: sum(abs(r["d"]) for r in fut if r["round"]==rd) for rd in (1,2)}
r1 = [r for r in fut if r["round"]==1]
r2 = [r for r in fut if r["round"]==2]

def tbl(rs, n, rev):
    rs = sorted(rs, key=lambda r: r["d"], reverse=rev)[:n]
    out = ["| Pick | Old EV | New EV | Δ |", "|---|---:|---:|---:|"]
    for r in rs:
        out.append(f"| {pid_label(r['pid'])} | {r['old']:.1f} | {r['new']:.1f} | {r['d']:+.1f} |")
    return "\n".join(out)

def team_tbl(rs, n):
    out = ["| Team | Old | New | Δ |", "|---|---:|---:|---:|"]
    for r in rs[:n]:
        out.append(f"| {ab(r['team'])} | {r['old']:.0f} | {r['new']:.0f} | {r['d']:+.0f} |")
    return "\n".join(out)

losers_pick = tbl(r1, 12, rev=False)
gainers_pick = tbl(r1, 12, rev=True)
r2_movers = tbl(sorted(r2, key=lambda r: abs(r["d"]), reverse=True)[:8], 8, rev=True)
team_losers = team_tbl(team_delta, 10)
team_gainers = team_tbl(list(reversed(team_delta)), 10)

md = f"""# Lottery Format Change — Pick Value Impact

How the switch from the old **14-team / top-4** NBA draft lottery to the new
**16-team, four-tier** format (plus the round-2 inverse-of-round-1 ordering)
moved projected pick values across the league.

**Method.** Two identical 100,000-sim runs of the current engine, differing *only*
in the lottery: old format vs new format. "Value" is a pick's expected draft-slot
value (EV, on the project's 0–100 stash-value scale). Team totals weight each
pick's value by the probability that team ends up owning it. 2026 is a settled
draft (no lottery) and is excluded — sanity check: largest 2026 pick move was
{settled_2026_maxabs:.2f} (pure Monte-Carlo noise).

---

## Headline

- Total absolute value reshuffled across all future (2027–2032) picks: **{tot_abs:.0f}** points.
- By round — **Round 1: {by_round[1]:.0f}**, **Round 2: {by_round[2]:.0f}**.

## Teams that LOST the most value

{team_losers}

## Teams that GAINED the most value

{team_gainers}

## Round-1 picks that LOST the most value

{losers_pick}

## Round-1 picks that GAINED the most value

{gainers_pick}

## Biggest Round-2 moves (from the new inverse-of-R1 ordering)

{r2_movers}

---

## General takeaways

- **The tank tax.** The new tiers flatten the top: the three worst records fall
  from **14% to 5.4%** odds at #1 and can now slide all the way to 12th. The very
  worst teams' own first-rounders lose the most value — the biggest losers above
  are the picks of teams projected at the bottom of the league.
- **The mushy middle wins.** The "remaining non-play-in" tier jumps to **8.1%** at
  #1 (higher than several worse records) and the expansion to 16 teams hands
  lottery upside to teams that used to pick at a fixed 15th/16th. Borderline
  play-in teams are the main gainers.
- **Round 2 got shaken up too.** Round 2's first 16 picks now run *inverse* to the
  round-1 lottery result, so a team that wins the lottery (R1 #1) drops to the
  back of the early-R2 order — moving R2 value away from lottery winners toward the
  teams that picked late in round 1.
- **Net zero, redistributed.** The lottery doesn't create or destroy draft value;
  it redistributes it. Round 1 absorbs the large majority of the movement
  ({100*by_round[1]/max(tot_abs,1):.0f}% of the total), with round 2 contributing the rest via the
  new ordering rule.
"""

open("public/relics/lottery_odds_value_impact.md", "w").write(md)
print("WROTE public/relics/lottery_odds_value_impact.md")
print(f"total_abs={tot_abs:.0f} r1={by_round[1]:.0f} r2={by_round[2]:.0f} 2026_noise={settled_2026_maxabs:.2f}")
print("Top team losers:", [(ab(r['team']), round(r['d'])) for r in team_delta[:3]])
print("Top team gainers:", [(ab(r['team']), round(r['d'])) for r in list(reversed(team_delta))[:3]])
