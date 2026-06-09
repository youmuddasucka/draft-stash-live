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

PELTON_CURVE = {
    1: 1.00,   2: 0.775,  3: 0.6675, 4: 0.6025, 5: 0.56,
    6: 0.5275, 7: 0.50,   8: 0.4775, 9: 0.4575, 10: 0.43,
    11: 0.40,  12: 0.375, 13: 0.35,  14: 0.33,  15: 0.31,
    16: 0.295, 17: 0.2825,18: 0.27,  19: 0.2575,20: 0.245,
    21: 0.23,  22: 0.215, 23: 0.20,  24: 0.1875,25: 0.175,
    26: 0.165, 27: 0.155, 28: 0.1425,29: 0.13,  30: 0.1175,
    31: 0.09,  32: 0.0875,33: 0.0825,34: 0.08,  35: 0.075,
    36: 0.0725,37: 0.07,  38: 0.0675,39: 0.0625,40: 0.06,
    41: 0.0575,42: 0.055, 43: 0.0525,44: 0.05,  45: 0.0475,
    46: 0.045, 47: 0.0425,48: 0.04,  49: 0.0375,50: 0.035,
    51: 0.0325,52: 0.03,  53: 0.0275,54: 0.025, 55: 0.0225,
    56: 0.0225,57: 0.02,  58: 0.0175,59: 0.015, 60: 0.0125,
}

LOTTERY_COMBOS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5]
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
    def __init__(self, r1: list, r2: list):
        # r1: 30 teams, index 0 = pick 1
        # r2: 30 teams, index 0 = pick 31
        self.r1 = {team: i + 1 for i, team in enumerate(r1)}
        self.r2 = {team: i + 31 for i, team in enumerate(r2)}

    def position_of(self, team: str, rnd: int) -> int:
        if rnd == 1:
            return self.r1[team]
        return self.r2[team]


def apply_lottery(pre_order: list) -> list:
    lottery = pre_order[:14]
    non_lottery = pre_order[14:]

    available = list(range(14))
    winners_idx = []

    for _ in range(4):
        total = sum(LOTTERY_COMBOS[i] for i in available)
        r = random.uniform(0, total)
        cumulative = 0.0
        for idx in available:
            cumulative += LOTTERY_COMBOS[idx]
            if r <= cumulative:
                winners_idx.append(idx)
                available.remove(idx)
                break

    winners = [lottery[i] for i in winners_idx]
    remain = [lottery[i] for i in range(14) if i not in winners_idx]
    return winners + remain + non_lottery


def blend_order(base: list, t: float, random_teams: set = None) -> list:
    rand_perm = random.sample(base, len(base))
    rand_rank = {team: i for i, team in enumerate(rand_perm)}
    scores = {}
    for i, team in enumerate(base):
        team_t = 1.0 if (random_teams and team in random_teams) else t
        scores[team] = (1 - team_t) * i + team_t * rand_rank[team]
    return sorted(scores.keys(), key=lambda team: scores[team])


def generate_order(baseline: dict, year: int, random_teams_by_year: dict = None) -> DraftOrder:
    t = max(0.0, min(1.0, (year - BASE_YEAR) / 6))
    rteams = (random_teams_by_year or {}).get(year, set())

    r1_blended = blend_order(baseline[year]["r1"], t, rteams)
    # Skip lottery for settled years (BASE_YEAR draft already happened)
    r1_final = r1_blended if year <= BASE_YEAR else apply_lottery(r1_blended)

    r2_blended = blend_order(baseline[year]["r2"], t, rteams)

    return DraftOrder(r1_final, r2_blended)


# ─────────────────────────────────────────────────────────────────────────────
# PELTON VALUE
# ─────────────────────────────────────────────────────────────────────────────

def pelton_value(pick: dict, order: DraftOrder) -> float:
    team = pick["original_team"]
    rnd = pick["round"]
    pos = order.position_of(team, rnd)
    raw = PELTON_CURVE[pos] * 100
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

def evaluate_triggers(triggers: list, logic: str, order: DraftOrder, all_picks: dict) -> bool:
    results = []
    for trig in triggers:
        ref = all_picks[trig["pick"]]
        pos = order.position_of(ref["original_team"], ref["round"])
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
    return {"owner": owner, "value": pelton_value(pick, order)}


def resolve_pro_pick(pick: dict, order: DraftOrder) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])
    if "condition" in rule:
        a, b = rule["condition"]["range"]
        owner = rule["if_in_range_to"] if a <= pos <= b else rule["if_not_in_range_to"]
    else:
        a, b = rule["protection_range"]
        owner = rule["if_protected_to"] if a <= pos <= b else rule["if_not_protected_to"]
    return {"owner": owner, "value": pelton_value(pick, order)}


def resolve_backup(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    rule = pick["rules"]
    triggered = evaluate_triggers(rule["triggers"], rule["trigger_logic"], order, all_picks)
    owner = rule["if_triggered_to"] if triggered else rule["if_not_triggered_to"]
    return {"owner": owner, "value": pelton_value(pick, order)}


def resolve_pro_backup(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])
    triggered = evaluate_triggers(rule["triggers"], rule["trigger_logic"], order, all_picks)
    a, b = rule["protection_range"]
    if triggered:
        owner = rule["if_triggered_and_protected_to"] if a <= pos <= b else rule["if_triggered_and_not_protected_to"]
    else:
        owner = rule["if_not_triggered_and_protected_to"] if a <= pos <= b else rule["if_not_triggered_and_not_protected_to"]
    return {"owner": owner, "value": pelton_value(pick, order)}


def resolve_pro_backup_branched(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    rule = pick["rules"]
    pos = order.position_of(pick["original_team"], pick["round"])

    for branch in rule["branches"]:
        triggered = evaluate_triggers(
            branch["triggers"], branch["trigger_logic"], order, all_picks
        )
        if triggered:
            a, b = branch["protection_range"]
            if a <= pos <= b:
                owner = branch["if_triggered_and_protected_to"]
            else:
                owner = branch["if_triggered_and_not_protected_to"]
            return {"owner": owner, "value": pelton_value(pick, order)}

    # No branch triggered — use top-level fallback
    # Denver: both fallback fields are "Denver Nuggets" so protection check is moot,
    # but we check anyway for correctness on any future pro_backup_branched picks.
    a, b = rule["branches"][0]["protection_range"]
    if a <= pos <= b:
        owner = rule["if_not_triggered_and_protected_to"]
    else:
        owner = rule["if_not_triggered_and_not_protected_to"]
    return {"owner": owner, "value": pelton_value(pick, order)}


def resolve_swap(pick: dict, order: DraftOrder, all_picks: dict) -> dict:
    """Handles unpro_swap, pro_swap, triple_swap, pro_triple_swap."""
    rule = pick["rules"]
    target_id = pick["pick_id"]

    active, direct_outs = build_pool(rule["pool"], order, all_picks)

    if target_id in direct_outs:
        return {"owner": direct_outs[target_id], "value": pelton_value(pick, order)}

    if target_id not in active:
        return {"owner": pick["original_team"], "value": pelton_value(pick, order)}

    pool_info = rank_pool(active, order, all_picks)
    N = len(pool_info)
    target_index = next(
        (i for i, (pid, _) in enumerate(pool_info) if pid == target_id), None
    )
    if target_index is None:
        return {"owner": pick["original_team"], "value": pelton_value(pick, order)}

    for block in rule["allocation"]:
        desired = allocation_index(block["rank"])
        if target_index == desired:
            if "to" in block:
                return {"owner": block["to"], "value": pelton_value(pick, order)}
            # conditional allocation: check this pick's own position
            pos = order.position_of(pick["original_team"], pick["round"])
            a, b = block["condition"]["range"]
            owner = block["if_in_range_to"] if a <= pos <= b else block["if_not_in_range_to"]
            return {"owner": owner, "value": pelton_value(pick, order)}

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
            return {"owner": direct_outs[target_id], "value": pelton_value(pick, order)}

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
                    return {"owner": block["to"], "value": pelton_value(pick, order)}

    return {"owner": pick["original_team"], "value": pelton_value(pick, order)}


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

def resolve_pick(pick: dict, order: DraftOrder, all_picks: dict, group_cache: dict) -> dict:
    from special_picks_solver import resolve_special

    if pick.get("frozen"):
        owner = pick["rules"].get("owner", pick["original_team"])
        # A frozen pick is valued at the 30th overall pick (end of 1st round),
        # decayed by year like any other future pick.
        years_ahead = max(0, pick["year"] - BASE_YEAR)
        frozen_value = round(PELTON_CURVE[30] * 100 * (DISCOUNT_RATE ** years_ahead), 1)
        return {"owner": owner, "value": frozen_value}

    rtype = pick["rules"]["type"]

    if rtype == "unprotected":
        return resolve_unprotected(pick, order)
    if rtype == "pro_pick":
        return resolve_pro_pick(pick, order)
    if rtype == "unpro_backup":
        return resolve_backup(pick, order, all_picks)
    if rtype == "pro_backup":
        return resolve_pro_backup(pick, order, all_picks)
    if rtype == "pro_backup_branched":
        return resolve_pro_backup_branched(pick, order, all_picks)
    if rtype in ("unpro_swap", "pro_swap", "pro_triple_swap"):
        return resolve_swap(pick, order, all_picks)
    if rtype in ("triple_swap", "nested_swap"):
        return resolve_nested_swap(pick, order, all_picks)
    if rtype == "special":
        return resolve_special(pick, order, all_picks, group_cache)

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

    print(f"Running {n_sims} simulations...")

    for sim in range(n_sims):
        if (sim + 1) % 500 == 0:
            print(f"  {sim + 1}/{n_sims}")

        orders = {year: generate_order(baseline, year, random_teams) for year in YEARS}
        resolved = {}
        group_cache = {}

        for pick_id, pick in all_picks.items():
            order = orders[pick["year"]]
            try:
                result = resolve_pick(pick, order, all_picks, group_cache)
                resolved[pick_id] = result
            except Exception as e:
                failures[pick_id] += 1
                resolved[pick_id] = {"owner": None, "value": None}

        apply_pool_mechanics(resolved, all_picks, orders)

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

    if failures:
        print(f"\nFailures (pick_id: count):")
        for pid, count in sorted(failures.items(), key=lambda x: -x[1])[:20]:
            print(f"  {pid}: {count}/{n_sims}")

    build_output(pick_results, all_picks, n_sims, output_dir)


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT
# ─────────────────────────────────────────────────────────────────────────────

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
