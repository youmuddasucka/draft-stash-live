"""
special_picks_solver.py

Resolves picks with rules.type == "special".
Imported by engine_v2.py — do not run directly.
"""

from engine_v2 import draft_value, evaluate_triggers


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def resolve_special(pick: dict, order, all_picks: dict, group_cache: dict, orders: dict) -> dict:
    """
    group_cache persists across calls within one simulation so swap groups
    are resolved exactly once per sim.
    """
    rule = pick["rules"]

    # ── Category A: swap_group ───────────────────────────────────────────────
    if "swap_group" in rule:
        group_id = rule["swap_group"]
        if group_id not in group_cache:
            group_picks = {
                pid: p
                for pid, p in all_picks.items()
                if p["rules"].get("swap_group") == group_id
            }
            group_cache[group_id] = resolve_group(group_id, group_picks, order)
        owner = group_cache[group_id][pick["pick_id"]]
        return {"owner": owner, "value": draft_value(pick, order)}

    # ── Category B1: single trigger_pick / trigger_condition  (MIA 2028 R2) ─
    if "trigger_pick" in rule:
        ref = all_picks[rule["trigger_pick"]]
        # Use the trigger pick's OWN year's order (it may differ from this pick's year,
        # e.g. MIA 2028 R2 hinges on the DAL 2027 1st).
        pos = orders[ref["year"]].position_of(ref["original_team"], ref["round"])
        a, b = rule["trigger_condition"]["range"]
        triggered = a <= pos <= b
        owner = rule["if_triggered_to"] if triggered else rule["if_not_triggered_to"]
        return {"owner": owner, "value": draft_value(pick, order)}

    # ── Category B2: triggers[] array  (POR 2028 R2) ────────────────────────
    if "triggers" in rule:
        triggered = evaluate_triggers(
            rule["triggers"], rule["trigger_logic"], orders, all_picks
        )
        owner = rule["if_triggered_to"] if triggered else rule["if_not_triggered_to"]
        return {"owner": owner, "value": draft_value(pick, order)}

    raise ValueError(f"Unrecognized special pick structure: {pick['pick_id']}")


# ─────────────────────────────────────────────────────────────────────────────
# GROUP DISPATCH
# ─────────────────────────────────────────────────────────────────────────────

def resolve_group(group_id: str, group_picks: dict, order) -> dict:
    """Returns { pick_id: owner_full_name } for every pick in the group."""
    if group_id == "281brknykphiphxwasmilpor":
        return resolve_group_281(group_picks, order)
    raise ValueError(f"Unknown swap_group: {group_id}")


# ─────────────────────────────────────────────────────────────────────────────
# GROUP: 281brknykphiphxwasmilpor
# 2028 R1 — BKN, PHI, PHX, NYK, WAS, MIL, POR
#
# Faithful to realGMmay8th2.txt lines 480 (main pool) + 587 (secondary swap).
# Lower draft position = more favorable. Validated against a from-prose reference
# in scripts/verify_group_281.py (the prior heuristic dropped New York's swap
# right entirely and misrouted the worst main-pool pick — wrong in ~95% of orders).
#
# MAIN POOL  {BKN, PHI(only if conveyed, i.e. lands 9-30), PHX, NYK}
#   Brooklyn: normally the two most favorable. Exception — if PHI is conveyed and
#     is the 3rd most favorable of the four AND NYK is the 1st or 2nd most
#     favorable, Brooklyn instead takes the 1st and 3rd most favorable.
#   New York: the least favorable of {NYK, BKN, PHX} when PHI is conveyed or NYK
#     is worse than both BKN and PHX; otherwise the 2nd most favorable of the three.
#   The one remaining main-pool pick is the "dreg":
#     Washington takes the more favorable of {its own pick, dreg};
#     Phoenix takes the less favorable of the two.
#
# SECONDARY SWAP  {WAS-result, MIL, POR}
#   Portland: the more favorable of {POR, MIL}.
#   Washington: the more favorable of {its main-pool result, less favorable of MIL/POR}.
#   Milwaukee: the less favorable of those two.
# ─────────────────────────────────────────────────────────────────────────────

def resolve_group_281(group_picks: dict, order) -> dict:
    IDS = {
        "BKN": "Brooklyn_Nets_2028_1",
        "PHI": "Philadelphia_76ers_2028_1",
        "PHX": "Phoenix_Suns_2028_1",
        "NYK": "New_York_Knicks_2028_1",
        "WAS": "Washington_Wizards_2028_1",
        "MIL": "Milwaukee_Bucks_2028_1",
        "POR": "Portland_Trail_Blazers_2028_1",
    }
    NAME = {
        "BKN": "Brooklyn Nets",      "PHI": "Philadelphia 76ers",
        "PHX": "Phoenix Suns",       "NYK": "New York Knicks",
        "WAS": "Washington Wizards", "MIL": "Milwaukee Bucks",
        "POR": "Portland Trail Blazers",
    }

    # The sim draws lottery slots independently, so two group picks can share a
    # draft position within a sim. Break such ties deterministically by a fixed
    # team order so the allocation is always a valid 1-to-1 partition (real drafts
    # have no ties, so the tiebreak never affects a real outcome).
    TIE = {"BKN": 0, "PHI": 1, "PHX": 2, "NYK": 3, "WAS": 4, "MIL": 5, "POR": 6}

    def key(k: str):
        pick = group_picks[IDS[k]]
        return (order.position_of(pick["original_team"], pick["round"]), TIE[k])

    res = {}  # team key -> owner team key

    # ── Main pool ────────────────────────────────────────────────────────────
    phi_conv = 9 <= key("PHI")[0] <= 30
    main = ["BKN", "PHX", "NYK"] + (["PHI"] if phi_conv else [])
    s = sorted(main, key=key)  # most favorable first

    # Brooklyn
    if phi_conv:
        if s[2] == "PHI" and (s[0] == "NYK" or s[1] == "NYK"):
            bkn = [s[0], s[2]]   # most + third most favorable
        else:
            bkn = [s[0], s[1]]   # two most favorable
    else:
        bkn = [s[0]]             # most favorable
        res["PHI"] = "PHI"       # protected (1-8) → stays home
    for t in bkn:
        res[t] = "BKN"

    # New York — over {NYK, BKN, PHX}
    s3 = sorted(["NYK", "BKN", "PHX"], key=key)
    nyk_worst = key("NYK") > key("BKN") and key("NYK") > key("PHX")
    nyk = s3[-1] if (phi_conv or nyk_worst) else s3[1]
    res[nyk] = "NYK"

    # Dreg = the lone remaining main-pool pick → Washington/Phoenix split
    dreg = next(t for t in main if t not in res)
    if key("WAS") <= key(dreg):
        was_main = "WAS"
        res[dreg] = "PHX"        # Phoenix gets the less favorable
    else:
        was_main = dreg
        res["WAS"] = "PHX"       # Phoenix gets the less favorable (Washington's own)

    # ── Secondary swap ───────────────────────────────────────────────────────
    if key("POR") <= key("MIL"):
        res["POR"] = "POR"
        lf_mp = "MIL"
    else:
        res["MIL"] = "POR"
        lf_mp = "POR"

    if key(was_main) <= key(lf_mp):
        res[was_main] = "WAS"
        res[lf_mp] = "MIL"
    else:
        res[lf_mp] = "WAS"
        res[was_main] = "MIL"

    return {IDS[t]: NAME[res[t]] for t in IDS}
