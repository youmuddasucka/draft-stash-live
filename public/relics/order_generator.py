"""
order_generator.py

INTERMEDIATE FILE: DO NOT CHANGE

this sim takes my hand-made draft order (seen in baseline)

it then creates a randomly generated draft order for each year

the two orders are averaged. 2026 is weighted strongly towards the baseline.
2032 is weighted strongly to the random

this file goes into full_monte_carlo_engine.py
"""

from __future__ import annotations
import csv
import random
from collections import defaultdict
from typing import Dict, List

# =====================================================================
# YEARS
# =====================================================================

YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032]

# =====================================================================
# 1. baseline rankings (hand-picked)
# =====================================================================

BASELINE = {
    2026: ["OKC","HOU","DEN","NYK","DET","LAL","ORL","CLE","SAS","BOS",
           "GSW","MIN","MIA","ATL","PHI","TOR","MEM","PHX","MIL","DAL",
           "LAC","POR","CHI","CHA","IND","SAC","NOP","UTA","BKN","WAS"],

    2027: ["OKC","HOU","DET","SAS","DEN","CLE","BOS","ATL","IND","TOR",
           "LAL","NYK","MIN","ORL","MIA","PHI","GSW","PHX","POR","NOP",
           "DAL","WAS","CHA","MEM","CHI","UTA","MIL","LAC","SAC","BKN"],

    2028: ["HOU","DET","OKC","SAS","MIN","LAL","BOS","DEN","IND","ATL",
           "CLE","TOR","ORL","MIA","DAL","LAC","NYK","PHI","POR","WAS",
           "CHA","NOP","GSW","UTA","PHX","CHI","MEM","BKN","MIL","SAC"],

    2029: ["SAS","OKC","MIN","HOU","DET","LAL","ORL","IND","DEN","BOS",
           "ATL","MIA","CLE","TOR","DAL","PHI","POR","WAS","NOP","CHA",
           "NYK","UTA","LAC","CHI","PHX","GSW","BKN","SAC","MIL","MEM"],

    2030: ["MIN","LAL","DET","SAS","PHI","HOU","OKC","ORL","DAL","ATL",
           "CLE","IND","DEN","WAS","CHA","TOR","NOP","POR","UTA","CHI",
           "MIA","NYK","BOS","BKN","GSW","SAC","MEM","PHX","MIL","LAC"],

    2031: ["LAL","SAS","PHI","MIN","DAL","OKC","DET","HOU","IND","WAS",
           "CHA","CLE","ATL","NOP","ORL","UTA","CHI","TOR","BOS","DEN",
           "POR","BKN","GSW","SAC","NYK","PHX","MIA","MIL","MEM","LAC"],

    2032: ["SAS","DET","PHI","LAL","IND","HOU","DAL","CHA","MIN","OKC",
           "WAS","UTA","CLE","BOS","POR","TOR","NOP","CHI","BKN","ATL",
           "GSW","DEN","SAC","NYK","ORL","MIA","PHX","MEM","MIL","LAC"],
}

# All 30 teams
ALL_TEAMS = BASELINE[2026]

# =====================================================================
# 2. add in randomization
# =====================================================================

def randomized_order(year: int) -> List[str]:
    baseline = BASELINE[year]

    # mixing weight: 0 in 2026 → 1 in 2032
    t = (year - 2026) / (2032 - 2026)
    t = max(0.0, min(1.0, t))  # safety clamp

    random_perm = random.sample(baseline, len(baseline))
    rand_rank = {team: i for i, team in enumerate(random_perm)}

    scores = {}
    for i, team in enumerate(baseline):
        base_score = i + 1
        rand_score = rand_rank[team] + 1
        scores[team] = (1 - t) * base_score + t * rand_score

    return sorted(scores.keys(), key=lambda t: scores[t], reverse=True)

# =====================================================================
# 3. apply lottery logic
# =====================================================================

LOTTERY_COMBOS = [140,140,140,125,105,90,75,60,45,30,20,15,10,5]

def apply_lottery(pre_order: List[str]) -> List[str]:
    lottery = pre_order[:14]
    non_lottery = pre_order[14:]

    available = list(range(14))
    winners_idx = []

    for _ in range(4):
        total = sum(LOTTERY_COMBOS[i] for i in available)
        r = random.uniform(0, total)
        cumulative = 0
        for idx in available:
            cumulative += LOTTERY_COMBOS[idx]
            if r <= cumulative:
                winners_idx.append(idx)
                available.remove(idx)
                break

    winners = [lottery[i] for i in winners_idx]
    remain = [lottery[i] for i in range(14) if i not in winners_idx]

    return winners + remain + non_lottery

# =====================================================================
# 4. create a simulated draft order
# =====================================================================

def generate_year_order(year: int):
    pre = randomized_order(year)
    return apply_lottery(pre)


# =====================================================================
# 5. export draft orders
# =====================================================================

def export_future_orders_csv(path: str):
    """
    Writes a single simulated future draft universe.
    Schema is consumed by DraftOrder in draft_engine.py
    """

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year", "round", "pick", "team"])

        for year in YEARS:
            order = generate_year_order(year)

            # Round 1
            for pick, team in enumerate(order, start=1):
                w.writerow([year, 1, pick, team])

            # Round 2 (reverse)
            for pick, team in enumerate(reversed(order), start=31):
                w.writerow([year, 2, pick, team])