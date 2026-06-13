"""
engine_v2.py

Monte Carlo pick simulation engine.
Run directly: python scripts/engine_v2.py

Outputs:
  public/sim-output/pick_cards.json      — one record per pick
  public/sim-output/team_pick_cards.json — one record per (team, pick) pair
"""

import json
import random
import csv
import os
import argparse
from pathlib import Path
from collections import defaultdict

def _mean(vals):
    return sum(vals) / len(vals)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

TEAM_MAP = {
    "Atlanta Hawks": "ATL",
    "Boston Celtics": "BOS",
    "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA",
    "Chicago Bulls": "CHI",
    "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL",
    "Denver Nuggets": "DEN",
    "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW",
    "Houston Rockets": "HOU",
    "Indiana Pacers": "IND",
    "Los Angeles Clippers": "LAC",
    "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA",
    "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP",
    "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC",
    "Orlando Magic": "ORL",
    "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR",
    "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS",
    "Toronto Raptors": "TOR",
    "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
}

VALUE_CURVE = {
    1: 1.0,     2: 0.84007, 3: 0.7516,  4: 0.6895,  5: 0.64183,
    6: 0.60223, 7: 0.56745, 8: 0.53702, 9: 0.50913, 10: 0.48013,
    11: 0.45108,12: 0.42505,13: 0.4007, 14: 0.37892,15: 0.35868,
    16: 0.34123,17: 0.32595,18: 0.31275,19: 0.29943,20: 0.28758,
    21: 0.27428,22: 0.26237,23: 0.24967,24: 0.2383, 25: 0.22705,
    26: 0.21682,27: 0.20703,28: 0.19608,29: 0.18613,30: 0.17563,
    31: 0.15018,32: 0.14385,33: 0.13697,34: 0.1311, 35: 0.125,
    36: 0.11983,37: 0.11443,38: 0.1097, 39: 0.10373,40: 0.0994,
    41: 0.0951, 42: 0.09053,43: 0.08663,44: 0.0824, 45: 0.07825,
    46: 0.0741, 47: 0.06998,48: 0.0659, 49: 0.06215,50: 0.05815,
    51: 0.05445,52: 0.05108,53: 0.04745,54: 0.0435, 55: 0.03955,
    56: 0.0369, 57: 0.03333,58: 0.02947,59: 0.02625,60: 0.02242,
}

# 2026 lottery format: 16 lottery teams in four record-based tiers. Each tier row
# is the published P(land at slot 1..16). We draw by a sequential weighted draw
# over slots (no ping-pong sim): slot 1 uses every team's "1st" column (which sum
# to ~100%, so #1 odds are exact), slot 2 the "2nd" column among the teams left,
# etc. Rows are the official table; minor rounding (rows ~99-101%) is harmless
# since each draw renormalises. Tier is assigned by league-wide projected-standings
# rank (the sim has no conferences/play-in to model directly).
LOTTERY_SIZE = 16
LOTTERY_TIER_ROWS = {
    "worst3": [5.4, 5, 6, 6, 6, 6, 6, 6, 6, 8, 14, 25, 0, 0, 0, 0],   # ranks 0-2: three worst records
    "next7":  [8.1, 8, 8, 8, 8, 7, 7, 7, 7, 6, 4, 2, 7, 6, 5, 3],     # ranks 3-9: remaining non-play-in
    "seeds":  [5.4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 5, 2, 9, 9, 9, 7],     # ranks 10-13: 9th/10th play-in seeds
    "losers": [2.7, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 2, 8, 10, 15, 27],  # ranks 14-15: 7v8 play-in losers
}


def lottery_tier(rank: int) -> str:
    if rank < 3:  return "worst3"
    if rank < 10: return "next7"
    if rank < 14: return "seeds"
    return "losers"


# Consecutive-year caps, enforced from 2027 looking back (a team can't land the #1
# pick in back-to-back years, nor a top-5 pick three years running). Seeded with
# the real pre-data drafts so 2027 can look back to 2025/2026.
#   2025 actual: #1 Dallas (Flagg); top 5 Dallas, San Antonio, Philadelphia,
#   Charlotte (Knueppel), Utah.
PRIOR_NUM1 = {2025: "Dallas Mavericks"}
PRIOR_TOP5 = {
    2025: {"Dallas Mavericks", "San Antonio Spurs", "Philadelphia 76ers",
           "Charlotte Hornets", "Utah Jazz"},
}

YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032]
BASE_YEAR = 2026
DISCOUNT_RATE = 0.98


# ─────────────────────────────────────────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────────────────────────────────────────

def load_all_picks(data_dir):
    picks = {}
    errors = []
    for json_file in Path(data_dir).rglob("*.json"):
        try:
            with open(json_file) as f:
                data = json.load(f)
            picks[data["pick_id"]] = data
        except Exception as e:
            errors.append((json_file.name, str(e)))
    if errors:
        for name, err in errors:
            print(f"  [LOAD ERROR] {name}: {err}")
    print(f"Loaded {len(picks)} picks ({len(errors)} errors)")
    return picks


def load_random_teams(relics_dir: str) -> dict:
    """
    Returns { year(int): set(full_team_names) }
    Reads random_teams.json which stores team abbreviations.
    Teams in this set will be fully randomized regardless of baseline position.
    """
    path = os.path.join(relics_dir, "random_teams.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        data = json.load(f)
    abbr_to_name = {v: k for k, v in TEAM_MAP.items()}
    result = {}
    for year_str, abbrs in data.items():
        result[int(year_str)] = set(abbr_to_name[a] for a in abbrs if a in abbr_to_name)
    return result


def load_baseline(csv_path):
    """
    Returns { year: { 'r1': [team, ...] x30, 'r2': [team, ...] x30 } }
    r1[0] = pick 1 (worst team / first lottery pick)
    r2[0] = pick 31
    CSV uses full team names.
    """
    raw = defaultdict(lambda: {"r1": {}, "r2": {}})
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row["year"])
            team = row["team"]
            pick = int(row["pick"])
            if pick <= 30:
                raw[year]["r1"][pick] = team
            else:
                raw[year]["r2"][pick] = team

    baseline = {}
    for year in raw:
        baseline[year] = {
            "r1": [raw[year]["r1"][p] for p in range(1, 31)],
            "r2": [raw[year]["r2"][p] for p in range(31, 61)],
        }
    return baseline


# ─────────────────────────────────────────────────────────────────────────────
# DRAFT ORDER
# ─────────────────────────────────────────────────────────────────────────────

class DraftOrder:
    def __init__(self, r1_slots: dict, r2_slots: dict):
        # team -> overall pick number. r1: picks 1-30, r2: picks 31-60.
        # Lottery slots are sampled per team from the marginal odds, so within a
        # single sim two lottery teams can share a slot — per-team/per-pick slot
        # marginals and values stay exact; only direct lottery-vs-lottery swap
        # odds are mildly approximate.
        self.r1 = r1_slots
        self.r2 = r2_slots

    def position_of(self, team: str, rnd: int) -> int:
        if rnd == 1:
            return self.r1[team]
        return self.r2[team]

    @staticmethod
    def from_lists(r1: list, r2: list) -> "DraftOrder":
        return DraftOrder({team: i + 1 for i, team in enumerate(r1)},
                          {team: i + 31 for i, team in enumerate(r2)})


def apply_lottery(pre_order: list, forbidden_num1: set = frozenset(),
                  forbidden_top5: set = frozenset()) -> dict:
    """Return {team: pick_number} for round 1. Each lottery team (bottom 16 of the
    projected order) draws its slot 1-16 directly from its tier's published
    distribution — we 'apply the odds' rather than mock ping-pong draws, so every
    team's slot marginals match the table exactly and the consecutive-year caps
    are enforced precisely by zeroing forbidden slots before the draw. Non-lottery
    teams keep records-based slots 17-30. (Independent per-team draws mean two
    lottery teams may share a slot in a given sim; exact for per-pick odds/values,
    mildly approximate only for direct lottery-vs-lottery swaps.)"""
    lottery = pre_order[:LOTTERY_SIZE]
    non_lottery = pre_order[LOTTERY_SIZE:]
    slots: dict = {}
    for rank, team in enumerate(lottery):
        row = list(LOTTERY_TIER_ROWS[lottery_tier(rank)])
        if team in forbidden_num1:
            row[0] = 0.0
        if team in forbidden_top5:
            for s in range(5):
                row[s] = 0.0
        total = sum(row)
        if total <= 0:
            # Forbidden through the whole top 5 (rare): fall back to this tier's
            # natural distribution over slots 6-16 only.
            base = LOTTERY_TIER_ROWS[lottery_tier(rank)]
            row = [0.0] * 5 + list(base[5:])
            total = sum(row)
        r = random.uniform(0, total)
        cum = 0.0
        slot = LOTTERY_SIZE
        for s, w in enumerate(row):
            cum += w
            if r <= cum:
                slot = s + 1
                break
        slots[team] = slot
    for j, team in enumerate(non_lottery):
        slots[team] = LOTTERY_SIZE + 1 + j  # 17..30, by record
    return slots


def build_round2(r1_slots: dict, lottery: list, non_lottery: list) -> dict:
    """Round 2: the first 16 picks (31-46) are the inverse of the round-1 lottery
    order (the worst R1 result picks first), then non-lottery teams in record order
    (47-60). With independent lottery slots we rank the 16 lottery teams by their
    sampled R1 slot — ties broken by projected record — to recover the R1 order."""
    rank_of = {team: i for i, team in enumerate(lottery)}  # 0 = worst record
    ranked = sorted(lottery, key=lambda t: (r1_slots[t], rank_of[t]))  # best R1 first
    r2: dict = {}
    for i, team in enumerate(reversed(ranked)):  # worst R1 first -> pick 31
        r2[team] = 31 + i
    for j, team in enumerate(non_lottery):
        r2[team] = 47 + j
    return r2


def lottery_constraints(year: int, history: dict):
    """Forbidden teams for this year's lottery under the consecutive-year caps
    (enforced from 2027). Rule 1: a team that was #1 last year can't be #1 again.
    Rule 2: a team that landed top-5 in BOTH of the last two years can't land
    top-5 this year. `history[y]` holds {"num1", "top5"} for resolved years."""
    forbidden_num1: set = set()
    forbidden_top5: set = set()
    if year < 2027:
        return forbidden_num1, forbidden_top5
    history = history or {}
    prev = history.get(year - 1)
    if prev:
        forbidden_num1 |= set(prev["num1"])
    y1, y2 = history.get(year - 1), history.get(year - 2)
    if y1 and y2:
        forbidden_top5 = set(y1["top5"]) & set(y2["top5"])
    return forbidden_num1, forbidden_top5


def blend_order(base: list, t: float, random_teams: set = None) -> list:
    rand_perm = random.sample(base, len(base))
    rand_rank = {team: i for i, team in enumerate(rand_perm)}
    scores = {}
    for i, team in enumerate(base):
        team_t = 1.0 if (random_teams and team in random_teams) else t
        scores[team] = (1 - team_t) * i + team_t * rand_rank[team]
    return sorted(scores.keys(), key=lambda team: scores[team])


def generate_order(baseline: dict, year: int, random_teams_by_year: dict = None,
                   history: dict = None) -> DraftOrder:
    t = max(0.0, min(1.0, (year - BASE_YEAR) / 6))
    rteams = (random_teams_by_year or {}).get(year, set())

    r1_blended = blend_order(baseline[year]["r1"], t, rteams)
    if year <= BASE_YEAR:
        # Settled draft (already happened): no lottery, real R2 order from baseline.
        order = DraftOrder.from_lists(r1_blended, baseline[year]["r2"])
    else:
        forbidden_num1, forbidden_top5 = lottery_constraints(year, history)
        r1_slots = apply_lottery(r1_blended, forbidden_num1, forbidden_top5)
        lottery, non_lottery = r1_blended[:LOTTERY_SIZE], r1_blended[LOTTERY_SIZE:]
        r2_slots = build_round2(r1_slots, lottery, non_lottery)
        order = DraftOrder(r1_slots, r2_slots)

    # Record this year's lottery outcome (sets, since independent draws can leave a
    # slot with zero or several teams) so later years can apply the caps.
    if history is not None:
        history[year] = {
            "num1": {team for team, s in order.r1.items() if s == 1},
            "top5": {team for team, s in order.r1.items() if s <= 5},
        }

    return order


# ─────────────────────────────────────────────────────────────────────────────
# DRAFT VALUE
# ─────────────────────────────────────────────────────────────────────────────

def draft_value(pick: dict, order: DraftOrder) -> float:
    team = pick["original_team"]
    rnd = pick["round"]
    pos = order.position_of(team, rnd)
    raw = VALUE_CURVE[pos] * 100
    years_ahead = max(0, pick["year"] - BASE_YEAR)
    return round(raw * (DISCOUNT_RATE ** years_ahead), 1)


# ─────────────────────────────────────────────────────────────────────────────
# POOL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def build_pool(pool_spec: list, order: DraftOrder, all_picks: dict):
    """
    Returns (active_ids, direct_outs).
    active_ids: pick_ids that enter the swap pool.
    direct_outs: { pick_id: owner } for picks blocked from pool with explicit destination.
    """
    active = []
    direct_outs = {}

    for entry in pool_spec:
        if isinstance(entry, str):
            active.append(entry)
        elif isinstance(entry, dict) and "pick" in entry and "condition" in entry:
            pid = entry["pick"]
            ref = all_picks[pid]
            pos = order.position_of(ref["original_team"], ref["round"])
            a, b = entry["condition"]["range"]
            if a <= pos <= b:
                active.append(pid)
            else:
                if "if_not_in_range_to" in entry:
                    direct_outs[pid] = entry["if_not_in_range_to"]
                # fallback_pick is its own obligation handled by a separate JSON file

    return active, direct_outs


def rank_pool(active_ids: list, order: DraftOrder, all_picks: dict) -> list:
    """Returns [(pick_id, draft_pos), ...] sorted best first (lowest pick number)."""
    pool_info = []
    for pid in active_ids:
        ref = all_picks[pid]
        pos = order.position_of(ref["original_team"], ref["round"])
        pool_info.append((pid, pos))
    pool_info.sort(key=lambda x: x[1])
    return pool_info


def allocation_index(rank_str: str) -> int:
    """Maps "1" -> 0, "2" -> 1, etc."""
    return int(rank_str) - 1


# ─────────────────────────────────────────────────────────────────────────────
# TRIGGER HELPER
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_triggers(triggers: list, logic: str, orders: dict, all_picks: dict) -> bool:
    results = []
    for trig in triggers:
        ref = all_picks[trig["pick"]]
        # A trigger can reference a pick from a DIFFERENT year than the pick being
        # resolved (e.g. Denver's 2029/2030 OKC obligations hinge on its 2027 slot).
        # Look up each trigger pick in ITS OWN year's draft order, not the current one.
        ref_order = orders[ref["year"]]
        pos = ref_order.position_of(ref["original_team"], ref["round"])
        a, b = trig["condition"]["range"]
        results.append(a <= pos <= b)
    if logic in ("ALL", "AND"):
        return all(results)
    if logic in ("OR", "ANY"):
        return any(results)
    raise ValueError(f"Unknown trigger_logic: {logic}")


# ─────────────────────────────────────────────────────────────────────────────
# RESOLVERS
# ─────────────────────────────────────────────────────────────────────────────

def resolve_unprotected(pick: dict, order: DraftOrder) -> dict:
    rule = pick["rules"]
    owner = rule.get("owner") or rule.get("to", pick["original_team"])
    return {"owner": owner, "value": draft_value(pick, order)}


def resolve_pro_pick(pick: dict, order: DraftOrder) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])
    if "condition" in rule:
        a, b = rule["condition"]["range"]
        owner = rule["if_in_range_to"] if a <= pos <= b else rule["if_not_in_range_to"]
    else:
        a, b = rule["protection_range"]
        owner = rule["if_protected_to"] if a <= pos <= b else rule["if_not_protected_to"]
    return {"owner": owner, "value": draft_value(pick, order)}


def resolve_backup(pick: dict, order: DraftOrder, all_picks: dict, orders: dict) -> dict:
    rule = pick["rules"]
    triggered = evaluate_triggers(rule["triggers"], rule["trigger_logic"], orders, all_picks)
    owner = rule["if_triggered_to"] if triggered else rule["if_not_triggered_to"]
    return {"owner": owner, "value": draft_value(pick, order)}


def resolve_pro_backup(pick: dict, order: DraftOrder, all_picks: dict, orders: dict) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])
    triggered = evaluate_triggers(rule["triggers"], rule["trigger_logic"], orders, all_picks)
    a, b = rule["protection_range"]
    if triggered:
        owner = rule["if_triggered_and_protected_to"] if a <= pos <= b else rule["if_triggered_and_not_protected_to"]
    else:
        owner = rule["if_not_triggered_and_protected_to"] if a <= pos <= b else rule["if_not_triggered_and_not_protected_to"]
    return {"owner": owner, "value": draft_value(pick, order)}


def resolve_pro_backup_branched(pick: dict, order: DraftOrder, all_picks: dict, orders: dict) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])

    for branch in rule["branches"]:
        triggered = evaluate_triggers(
            branch["triggers"], branch["trigger_logic"], orders, all_picks
        )
        if triggered:
            a, b = branch["protection_range"]
            if a <= pos <= b:
                owner = branch["if_triggered_and_protected_to"]
            else:
                owner = branch["if_triggered_and_not_protected_to"]
            return {"owner": owner, "value": draft_value(pick, order)}

    # No branch triggered — use top-level fallback
    # Denver: both fallback fields are "Denver Nuggets" so protection check is moot,
    # but we check anyway for correctness on any future pro_backup_branched picks.
    a, b = rule["branches"][0]["protection_range"]
    if a <= pos <= b:
        owner = rule["if_not_triggered_and_protected_to"]
    else:
        owner = rule["if_not_triggered_and_not_protected_to"]
    return {"owner": owner, "value": draft_value(pick, order)}


def resolve_swap(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    """Handles unpro_swap, pro_swap, pro_triple_swap, cond_alloc_swap.

    Flat pool + allocation. Pool entries may be conditional (pro_swap /
    pro_triple_swap) and allocation entries may be conditional — a ranked slot
    whose destination depends on where that pick landed (cond_alloc_swap)."""
    rule = pick["rules"]
    target_id = pick["pick_id"]

    active, direct_outs = build_pool(rule["pool"], order, all_picks)

    if target_id in direct_outs:
        return {"owner": direct_outs[target_id], "value": draft_value(pick, order)}

    if target_id not in active:
        return {"owner": pick["original_team"], "value": draft_value(pick, order)}

    pool_info = rank_pool(active, order, all_picks)
    N = len(pool_info)
    target_index = next(
        (i for i, (pid, _) in enumerate(pool_info) if pid == target_id), None
    )
    if target_index is None:
        return {"owner": pick["original_team"], "value": draft_value(pick, order)}

    for block in rule["allocation"]:
        desired = allocation_index(block["rank"])
        if target_index == desired:
            if "to" in block:
                return {"owner": block["to"], "value": draft_value(pick, order)}
            # conditional allocation: check this pick's own position
            pos = order.position_of(pick["original_team"], pick["round"])
            a, b = block["condition"]["range"]
            owner = block["if_in_range_to"] if a <= pos <= b else block["if_not_in_range_to"]
            return {"owner": owner, "value": draft_value(pick, order)}

    raise RuntimeError(
        f"No allocation matched for {target_id} (index={target_index}, N={N}, "
        f"allocation={rule['allocation']})"
    )


def resolve_nested_swap(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    rule = pick["rules"]
    target_id = pick["pick_id"]
    temp_map = {}

    for level in rule["levels"]:
        pool_spec = []
        for entry in level["pool"]:
            if isinstance(entry, str) and entry.startswith("TEMP_"):
                if entry in temp_map:
                    pool_spec.append(temp_map[entry])
                # else: TEMP not set — pick didn't flow through this path, skip
            elif isinstance(entry, dict) and entry.get("pick", "").startswith("TEMP_"):
                tkey = entry["pick"]
                if tkey in temp_map:
                    pool_spec.append({**entry, "pick": temp_map[tkey]})
                # else: skip
            else:
                pool_spec.append(entry)

        active, direct_outs = build_pool(pool_spec, order, all_picks)

        if target_id in direct_outs:
            return {"owner": direct_outs[target_id], "value": draft_value(pick, order)}

        if not active:
            continue

        pool_info = rank_pool(active, order, all_picks)
        N = len(pool_info)

        for block in level["allocation"]:
            idx = allocation_index(block["rank"])
            if idx >= N:
                continue
            assigned_pid = pool_info[idx][0]

            if block["to"].startswith("TEMP_"):
                temp_map[block["to"]] = assigned_pid
            else:
                if assigned_pid == target_id:
                    return {"owner": block["to"], "value": draft_value(pick, order)}

    return {"owner": pick["original_team"], "value": draft_value(pick, order)}


# ─────────────────────────────────────────────────────────────────────────────
# POST-RESOLUTION: POOL MECHANICS  (e.g. DET/UTH 2028 R2 pool)
# ─────────────────────────────────────────────────────────────────────────────

def apply_pool_mechanics(resolved: dict, all_picks: dict, orders: dict):
    pool_groups = defaultdict(list)
    for pick_id, pick in all_picks.items():
        top_pool = pick.get("pool")
        if isinstance(top_pool, dict) and "pool_id" in top_pool:
            pool_groups[top_pool["pool_id"]].append(pick_id)

    for pool_id, pick_ids in pool_groups.items():
        pool_def = all_picks[pick_ids[0]]["pool"]
        trigger_owner = pool_def["enters_pool_if"]["resolves_to"]
        final_dest = pool_def["pool_resolution"]["to"]
        rank_rule = pool_def["pool_resolution"]["rank"]

        eligible = []
        for pid in pick_ids:
            if pid not in resolved:
                continue
            if resolved[pid]["owner"] == trigger_owner:
                pick = all_picks[pid]
                order = orders[pick["year"]]
                pos = order.position_of(pick["original_team"], pick["round"])
                eligible.append((pid, pos))

        if not eligible:
            continue

        if rank_rule == "lf":
            worst_pid = max(eligible, key=lambda x: x[1])[0]
        else:
            raise ValueError(f"Unknown pool rank rule: {rank_rule}")

        resolved[worst_pid]["owner"] = final_dest


# ─────────────────────────────────────────────────────────────────────────────
# MAIN DISPATCH
# ─────────────────────────────────────────────────────────────────────────────

def resolve_pick(pick: dict, order: DraftOrder, all_picks: dict, group_cache: dict, orders: dict) -> dict:
    from special_picks_solver import resolve_special

    if pick.get("frozen"):
        owner = pick["rules"].get("owner", pick["original_team"])
        # A frozen pick is valued at the 30th overall pick (end of 1st round),
        # decayed by year like any other future pick.
        years_ahead = max(0, pick["year"] - BASE_YEAR)
        frozen_value = round(VALUE_CURVE[30] * 100 * (DISCOUNT_RATE ** years_ahead), 1)
        return {"owner": owner, "value": frozen_value}

    rtype = pick["rules"]["type"]

    if rtype == "unprotected":
        return resolve_unprotected(pick, order)
    if rtype == "pro_pick":
        return resolve_pro_pick(pick, order)
    if rtype == "unpro_backup":
        return resolve_backup(pick, order, all_picks, orders)
    if rtype == "pro_backup":
        return resolve_pro_backup(pick, order, all_picks, orders)
    if rtype == "pro_backup_branched":
        return resolve_pro_backup_branched(pick, order, all_picks, orders)
    if rtype in ("unpro_swap", "pro_swap", "pro_triple_swap", "cond_alloc_swap"):
        return resolve_swap(pick, order, all_picks)
    if rtype in ("triple_swap", "nested_swap"):
        return resolve_nested_swap(pick, order, all_picks)
    if rtype == "special":
        return resolve_special(pick, order, all_picks, group_cache, orders)

    raise ValueError(f"Unknown pick type: {rtype}")


# ─────────────────────────────────────────────────────────────────────────────
# MONTE CARLO
# ─────────────────────────────────────────────────────────────────────────────

def run_monte_carlo(data_dir: str, baseline_csv: str, n_sims: int = 100000, output_dir: str = "public/sim-output"):
    all_picks = load_all_picks(data_dir)
    baseline = load_baseline(baseline_csv)
    random_teams = load_random_teams(os.path.dirname(baseline_csv))

    # Per pick: { owners: {owner: count}, values_by_owner: {owner: [values]}, positions: [], positions_by_owner: {owner: [positions]} }
    pick_results = {
        pid: {
            "owners": defaultdict(int),
            "values_by_owner": defaultdict(list),
            "positions": [],
            "positions_by_owner": defaultdict(list),
        }
        for pid in all_picks
    }

    failures = defaultdict(int)

    # Stepien guarantees. For each (year, team) we track:
    #   floor  — the MINIMUM number of first-round picks the team holds across all
    #            sims, i.e. the count it is guaranteed in EVERY possible outcome.
    #   ge1    — how many sims the team held >=1 first that year (for hold_prob).
    # A first counts toward the Stepien rule only if it's held no matter how the
    # draft falls, so "guaranteed a first" == floor >= 1, and "has a spare it can
    # trade and still keep one" == floor >= 2. This is computed from the actual
    # per-sim ownership, so protected swaps (always leave you a pick) resolve to
    # guaranteed and one-way conditional conveyances (can leave you with nothing)
    # resolve to not-guaranteed, with no reliance on the pick_type label.
    stepien_floor = {year: {team: None for team in TEAM_MAP} for year in YEARS}
    stepien_ge1 = {year: defaultdict(int) for year in YEARS}
    # Stepien is a CONSECUTIVE-pair rule: a team must hold a first at least every
    # other year. The per-year floor above can't capture a cross-year obligation
    # that guarantees a first in (year OR year+1) without guaranteeing either one
    # alone (e.g. Denver's 2029/2030 OKC pick — it always keeps exactly one). So
    # we also track the pair floor: the min of (count[year] + count[year+1]) over
    # all sims. >= 1 means the pair can never both be empty → Stepien-safe.
    stepien_pair_floor = {year: {team: None for team in TEAM_MAP} for year in YEARS}

    print(f"Running {n_sims} simulations...")

    for sim in range(n_sims):
        if (sim + 1) % 500 == 0:
            print(f"  {sim + 1}/{n_sims}")

        # Generate years in chronological order so the consecutive-year caps can
        # look back at each team's prior lottery results. Seed with the real 2025
        # draft so 2027 (the first capped year) has a full two-year lookback.
        history = {2025: {"num1": {PRIOR_NUM1[2025]}, "top5": set(PRIOR_TOP5[2025])}}
        orders = {}
        for year in YEARS:
            orders[year] = generate_order(baseline, year, random_teams, history)
        resolved = {}
        group_cache = {}

        for pick_id, pick in all_picks.items():
            order = orders[pick["year"]]
            try:
                result = resolve_pick(pick, order, all_picks, group_cache, orders)
                resolved[pick_id] = result
            except Exception as e:
                failures[pick_id] += 1
                resolved[pick_id] = {"owner": None, "value": None}

        apply_pool_mechanics(resolved, all_picks, orders)

        # Count this sim's first-round picks held per (year, team) for Stepien.
        r1_counts = {year: defaultdict(int) for year in YEARS}

        for pick_id, result in resolved.items():
            if result["owner"] is None:
                continue
            pick = all_picks[pick_id]
            order = orders[pick["year"]]
            pos = order.position_of(pick["original_team"], pick["round"])
            owner = result["owner"]
            val = result["value"]

            pick_results[pick_id]["owners"][owner] += 1
            pick_results[pick_id]["positions"].append(pos)
            pick_results[pick_id]["positions_by_owner"][owner].append(pos)
            if val is not None:
                pick_results[pick_id]["values_by_owner"][owner].append(val)

            if pick["round"] == 1:
                r1_counts[pick["year"]][owner] += 1

        # Fold this sim into the running floor (guaranteed count) and >=1 tally.
        # Every team is considered each year so a sim where a team holds zero
        # firsts correctly drives its floor to 0.
        for idx, year in enumerate(YEARS):
            counts = r1_counts[year]
            next_counts = r1_counts[YEARS[idx + 1]] if idx + 1 < len(YEARS) else None
            for team in TEAM_MAP:
                c = counts.get(team, 0)
                if c >= 1:
                    stepien_ge1[year][team] += 1
                prev = stepien_floor[year][team]
                stepien_floor[year][team] = c if prev is None else min(prev, c)
                if next_counts is not None:
                    pair = c + next_counts.get(team, 0)
                    pprev = stepien_pair_floor[year][team]
                    stepien_pair_floor[year][team] = pair if pprev is None else min(pprev, pair)

    if failures:
        print(f"\nFailures (pick_id: count):")
        for pid, count in sorted(failures.items(), key=lambda x: -x[1])[:20]:
            print(f"  {pid}: {count}/{n_sims}")

    build_output(pick_results, all_picks, n_sims, output_dir)
    build_stepien_output(stepien_floor, stepien_ge1, stepien_pair_floor, n_sims, output_dir)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT
# ─────────────────────────────────────────────────────────────────────────────

def build_stepien_output(stepien_floor: dict, stepien_ge1: dict, stepien_pair_floor: dict, n_sims: int, output_dir: str):
    """
    Writes stepien_guarantees.json: one record per (team, year) with the
    guaranteed first-round floor and the probability of holding >=1 first.

      guaranteed_count — firsts held in EVERY sim (the Stepien-guaranteed floor).
                         >=1 satisfies the rule for that year; >=2 means a spare.
      hold_prob        — fraction of sims holding >=1 first (distinguishes a
                         conditional/protected year, 0 < p < 1, from a true gap, 0).
      pair_floor_next  — min of (firsts this year + firsts next year) over all
                         sims; >=1 means the (year, year+1) pair is never both
                         empty, so two individually-protected years can still be
                         jointly Stepien-safe. null for the final year (no pair).
    """
    os.makedirs(output_dir, exist_ok=True)
    records = []
    for year in YEARS:
        for team in TEAM_MAP:
            floor = stepien_floor[year][team] or 0
            pair = stepien_pair_floor[year][team]
            records.append({
                "team": team,
                "year": year,
                "guaranteed_count": floor,
                "hold_prob": round(stepien_ge1[year][team] / n_sims, 4),
                "pair_floor_next": pair,
            })

    with open(os.path.join(output_dir, "stepien_guarantees.json"), "w") as f:
        json.dump(records, f, indent=2)

    print(f"Saved {len(records)} stepien guarantee records")


def build_output(pick_results: dict, all_picks: dict, n_sims: int, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    pick_cards = []
    team_pick_cards = []

    for pick_id, results in pick_results.items():
        pick = all_picks[pick_id]

        if not results["owners"]:
            continue

        all_values = [v for vals in results["values_by_owner"].values() for v in vals]
        if not all_values:
            continue

        # Primary owner = whoever receives the pick most often
        primary_owner = max(results["owners"].items(), key=lambda x: x[1])[0]

        # ev and expected_slot use primary owner's conditional distributions so that
        # swap picks reflect the actual value/slot when each pick conveys to its owner,
        # not a blended unconditional average. For single-owner picks this is identical.
        primary_values    = results["values_by_owner"].get(primary_owner, [])
        primary_positions = results["positions_by_owner"].get(primary_owner, [])

        ev            = _mean(primary_values)    if primary_values    else _mean(all_values)
        expected_slot = _mean(primary_positions) if primary_positions else (_mean(results["positions"]) if results["positions"] else None)

        ownership = [
            {
                "team": owner,
                "prob": round(count / n_sims, 4),
                "conditional_ev": round(
                    _mean(results["values_by_owner"][owner]), 1
                ),
                "conditional_slot": round(
                    _mean(results["positions_by_owner"][owner]), 1
                ) if results["positions_by_owner"][owner] else None,
            }
            for owner, count in sorted(
                results["owners"].items(), key=lambda x: -x[1]
            )
        ]

        # Unconditional slot distribution — used to compute trigger probabilities
        slot_counts: dict[int, int] = defaultdict(int)
        for pos in results["positions"]:
            slot_counts[int(pos)] += 1
        slot_probs = {slot: round(count / n_sims, 4) for slot, count in sorted(slot_counts.items())}

        pick_cards.append({
            "pick_id": pick_id,
            "year": pick["year"],
            "round": pick["round"],
            "original_team": pick["original_team"],
            "pick_type": pick["rules"]["type"],
            "frozen": pick.get("frozen", False),
            "ev": round(ev, 1),
            "expected_slot": round(expected_slot, 1) if expected_slot else None,
            "ownership": ownership,
            "slot_probs": slot_probs,
        })

        for entry in ownership:
            team_pick_cards.append({
                "team": entry["team"],
                "pick_id": pick_id,
                "year": pick["year"],
                "round": pick["round"],
                "original_team": pick["original_team"],
                "pick_type": pick["rules"]["type"],
                "frozen": pick.get("frozen", False),
                "prob": entry["prob"],
                "ev": round(ev, 1),
                "conditional_ev": entry["conditional_ev"],
            })

    with open(os.path.join(output_dir, "pick_cards.json"), "w") as f:
        json.dump(pick_cards, f, indent=2)

    with open(os.path.join(output_dir, "team_pick_cards.json"), "w") as f:
        json.dump(team_pick_cards, f, indent=2)

    print(f"\nSaved {len(pick_cards)} pick cards")
    print(f"Saved {len(team_pick_cards)} team pick card entries")
    print(f"Output: {output_dir}/")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev", action="store_true", help="Dev mode: 5,000 sims (fast, for testing)")
    args = parser.parse_args()

    n_sims = 5000 if args.dev else 100000
    project_root = Path(__file__).parent.parent

    run_monte_carlo(
        data_dir=str(project_root / "public" / "pick-data" / "teams"),
        baseline_csv=str(project_root / "public" / "relics" / "future_draft_orders.csv"),
        n_sims=n_sims,
        output_dir=str(project_root / "public" / "sim-output"),
    )
