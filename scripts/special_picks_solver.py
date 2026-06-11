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
# 2028 R1 — BRK, PHI, PHX, NYK, WAS, MIL, POR
#
# Trade structure (sourced from trade_description in each JSON):
#
# STEP 1 — BRK main pool: {BRK, PHI(if 9-30), PHX, NYK}
#   Rank by draft position (pick 1 = most favorable).
#   rank 1 → BRK  (BRK takes the best pick)
#   rank 2 → BRK  (BRK also takes second best — "two most favorable")
#   rank N-1 → enters WAS comparison in Step 2
#   rank N   → PHX  (absolute worst of main pool)
#   PHI protected (1-8): stays home; pool shrinks to 3 (NYK, BRK, PHX).
#
# STEP 2 — WAS primary swap: WAS vs step-1 middle pick
#   More favorable → WAS.
#   Less favorable → to be resolved in Step 3 (goes to MIL eventually).
#
# STEP 3 — MIL/POR secondary, then WAS secondary swap:
#   Compare MIL vs POR:
#     more favorable → POR (POR always takes the better of the two)
#     less favorable → competes against WAS result from Step 2
#   WAS competes against less favorable of {MIL, POR}:
#     more favorable → WAS
#     less favorable → MIL
# ─────────────────────────────────────────────────────────────────────────────

def resolve_group_281(group_picks: dict, order) -> dict:
    IDS = {
        "BRK": "Brooklyn_Nets_2028_1",
        "PHI": "Philadelphia_76ers_2028_1",
        "PHX": "Phoenix_Suns_2028_1",
        "NYK": "New_York_Knicks_2028_1",
        "WAS": "Washington_Wizards_2028_1",
        "MIL": "Milwaukee_Bucks_2028_1",
        "POR": "Portland_Trail_Blazers_2028_1",
    }

    def pos(key: str) -> int:
        pick = group_picks[IDS[key]]
        return order.position_of(pick["original_team"], pick["round"])

    results = {}  # pick_id -> owner full name

    # ── Step 1: BRK main pool ────────────────────────────────────────────────
    phi_pos = pos("PHI")
    phi_enters = 9 <= phi_pos <= 30

    main_pool = ["BRK", "PHX", "NYK"]
    if phi_enters:
        main_pool.append("PHI")
    else:
        results[IDS["PHI"]] = "Philadelphia 76ers"

    main_pool_sorted = sorted(main_pool, key=pos)  # best first
    N = len(main_pool_sorted)

    # BRK gets picks at rank 0 and rank 1 (two most favorable)
    results[IDS[main_pool_sorted[0]]] = "Brooklyn Nets"
    results[IDS[main_pool_sorted[1]]] = "Brooklyn Nets"

    # PHX gets absolute worst (rank N-1)
    results[IDS[main_pool_sorted[N - 1]]] = "Phoenix Suns"

    # The middle pick (rank N-2) enters the WAS comparison
    # When N=3: index 1 is both rank-1 (already assigned to BRK) and rank N-2.
    # Collision: rank 1 == rank N-2 when N=3, but BRK already took rank 0 and rank 1.
    # With N=3: BRK gets [0] and [1], PHX gets [2], nothing left for WAS comparison.
    # In this case WAS just keeps its own pick, MIL/POR do their secondary swap.
    # When N=4: BRK gets [0],[1]; [2] enters WAS comparison; PHX gets [3].

    if N == 4:
        was_comparison_key = main_pool_sorted[2]
        was_comparison_available = True
    else:
        # N==3: no middle pick available for WAS comparison
        was_comparison_key = None
        was_comparison_available = False

    # ── Step 2: WAS primary swap ─────────────────────────────────────────────
    was_pos = pos("WAS")

    if was_comparison_available:
        comp_pos = pos(was_comparison_key)
        if was_pos < comp_pos:
            results[IDS["WAS"]] = "Washington Wizards"
        else:
            results[IDS[was_comparison_key]] = "Washington Wizards"
    else:
        results[IDS["WAS"]] = "Washington Wizards"

    # ── Step 3: MIL/POR secondary swap, then WAS secondary ───────────────────
    mil_pos = pos("MIL")
    por_pos = pos("POR")

    if mil_pos < por_pos:
        mf_key = "MIL"
        lf_key = "POR"
    else:
        mf_key = "POR"
        lf_key = "MIL"

    # POR always gets the more favorable of {MIL, POR}
    results[IDS[mf_key]] = "Portland Trail Blazers"

    # WAS secondary: WAS vs lf_of_{MIL,POR}
    # "better goes to WAS, less favorable goes to MIL"
    lf_pos = pos(lf_key)

    if was_pos < lf_pos:
        # WAS more favorable → WAS keeps (already set above unless step2_loser was WAS)
        # lf_key pick → MIL
        results[IDS[lf_key]] = "Milwaukee Bucks"
    else:
        # lf_key pick more favorable → goes to WAS (overwrites step 2 result for WAS)
        results[IDS[lf_key]] = "Washington Wizards"
        results[IDS["WAS"]] = "Milwaukee Bucks"

    # If step 2 had a loser from the main pool going to MIL, it's already handled:
    # the step-2 loser key's result was set in step 2 unless it was WAS.
    # If step2_loser_key was a main pool pick (e.g. NYK or PHI), it already has a result.
    # Verify all 7 are resolved.
    missing = [k for k, pid in IDS.items() if pid not in results]
    if missing:
        # Any main pool pick not yet assigned (shouldn't happen, but safety fallback)
        for k in missing:
            results[IDS[k]] = group_picks[IDS[k]]["original_team"]

    return results
