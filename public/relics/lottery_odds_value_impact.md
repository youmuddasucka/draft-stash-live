# Lottery Format Change — Pick Value Impact

How the switch from the old **14-team / top-4** NBA draft lottery to the new
**16-team, four-tier** format (plus the round-2 inverse-of-round-1 ordering)
moved projected pick values across the league.

**Method.** Two identical 100,000-sim runs of the current engine, differing *only*
in the lottery: old format vs new format. "Value" is a pick's expected draft-slot
value (EV, on the project's 0–100 stash-value scale). Team totals weight each
pick's value by the probability that team ends up owning it. 2026 is a settled
draft (no lottery) and is excluded — sanity check: largest 2026 pick move was
0.00 (pure Monte-Carlo noise).

---

## Headline

- Total absolute value reshuffled across all future (2027–2032) picks: **576** points.
- By round — **Round 1: 449**, **Round 2: 126**.

## Teams that LOST the most value

| Team | Old | New | Δ |
|---|---:|---:|---:|
| SAC | 441 | 408 | -34 |
| MEM | 609 | 577 | -31 |
| CHI | 493 | 479 | -14 |
| NOP | 326 | 312 | -14 |
| MIA | 292 | 284 | -8 |
| BKN | 690 | 683 | -7 |
| POR | 382 | 376 | -6 |
| HOU | 385 | 380 | -6 |
| WAS | 495 | 490 | -5 |
| LAC | 304 | 301 | -4 |

## Teams that GAINED the most value

| Team | Old | New | Δ |
|---|---:|---:|---:|
| PHI | 404 | 421 | +18 |
| SAS | 354 | 370 | +16 |
| CHA | 481 | 496 | +14 |
| DAL | 266 | 275 | +8 |
| TOR | 287 | 294 | +7 |
| IND | 205 | 212 | +7 |
| MIN | 99 | 106 | +6 |
| ATL | 364 | 369 | +5 |
| DEN | 146 | 150 | +4 |
| ORL | 185 | 189 | +4 |

## Round-1 picks that LOST the most value

| Pick | Old EV | New EV | Δ |
|---|---:|---:|---:|
| MIL 2027 1st | 73.4 | 46.7 | -26.7 |
| SAC 2027 1st | 71.7 | 55.5 | -16.2 |
| BKN 2027 1st | 69.8 | 56.7 | -13.1 |
| SAC 2028 1st | 67.2 | 55.4 | -11.8 |
| LAC 2027 1st | 68.2 | 57.3 | -10.9 |
| MEM 2028 1st | 62.7 | 52.1 | -10.6 |
| LAC 2028 1st | 64.6 | 55.6 | -9.0 |
| MIL 2028 1st | 66.2 | 57.7 | -8.5 |
| MEM 2027 1st | 66.2 | 57.9 | -8.3 |
| CLE 2029 1st | 52.7 | 46.9 | -5.8 |
| MIL 2029 1st | 44.6 | 38.8 | -5.8 |
| UTA 2027 1st | 51.3 | 45.7 | -5.6 |

## Round-1 picks that GAINED the most value

| Pick | Old EV | New EV | Δ |
|---|---:|---:|---:|
| MIL 2030 1st | 28.8 | 49.6 | +20.8 |
| NOP 2027 1st | 52.2 | 68.3 | +16.1 |
| MIA 2027 1st | 45.1 | 57.5 | +12.4 |
| PHI 2027 1st | 38.5 | 49.2 | +10.7 |
| GSW 2027 1st | 41.4 | 51.8 | +10.4 |
| ATL 2027 1st | 36.0 | 45.5 | +9.5 |
| PHI 2028 1st | 39.7 | 47.8 | +8.1 |
| PHX 2027 1st | 47.7 | 55.2 | +7.5 |
| CHA 2027 1st | 34.1 | 41.4 | +7.3 |
| TOR 2028 1st | 36.3 | 41.4 | +5.1 |
| POR 2027 1st | 32.2 | 36.7 | +4.5 |
| CHA 2028 1st | 32.3 | 36.8 | +4.5 |

## Biggest Round-2 moves (from the new inverse-of-R1 ordering)

| Pick | Old EV | New EV | Δ |
|---|---:|---:|---:|
| GSW 2027 2nd | 8.3 | 12.5 | +4.2 |
| NOP 2031 2nd | 5.3 | 9.3 | +4.0 |
| PHX 2032 2nd | 5.1 | 9.0 | +3.9 |
| ORL 2031 2nd | 9.1 | 5.3 | -3.8 |
| HOU 2032 2nd | 9.0 | 5.1 | -3.9 |
| SAC 2027 2nd | 14.2 | 10.1 | -4.1 |
| BKN 2027 2nd | 13.3 | 9.0 | -4.3 |
| LAC 2030 2nd | 10.9 | 5.3 | -5.6 |

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
  (78% of the total), with round 2 contributing the rest via the
  new ordering rule.
