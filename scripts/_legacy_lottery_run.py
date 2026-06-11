"""THROWAWAY: re-run the sim with the OLD 14-team lottery (everything else current)
so we can diff pick values before/after the lottery-format change. Delete after use."""
import importlib.util, random, sys, os

sys.path.insert(0, "scripts")
spec = importlib.util.spec_from_file_location("engine_v2", "scripts/engine_v2.py")
eng = importlib.util.module_from_spec(spec)
sys.modules["engine_v2"] = eng          # so special_picks_solver imports this instance
spec.loader.exec_module(eng)

# ── old lottery: 14 teams, 4 ping-pong winners, rest by record ──
LEGACY_COMBOS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5]

def legacy_apply_lottery(pre_order, *args, **kwargs):
    lottery = pre_order[:14]
    non_lottery = pre_order[14:]
    available = list(range(14))
    winners_idx = []
    for _ in range(4):
        total = sum(LEGACY_COMBOS[i] for i in available)
        r = random.uniform(0, total)
        cum = 0.0
        for idx in available:
            cum += LEGACY_COMBOS[idx]
            if r <= cum:
                winners_idx.append(idx)
                available.remove(idx)
                break
    winners = [lottery[i] for i in winners_idx]
    remain = [lottery[i] for i in range(14) if i not in winners_idx]
    return winners + remain + non_lottery

def legacy_generate_order(baseline, year, random_teams_by_year=None, history=None):
    t = max(0.0, min(1.0, (year - eng.BASE_YEAR) / 6))
    rteams = (random_teams_by_year or {}).get(year, set())
    r1 = eng.blend_order(baseline[year]["r1"], t, rteams)
    r1_final = r1 if year <= eng.BASE_YEAR else legacy_apply_lottery(r1)
    r2 = eng.blend_order(baseline[year]["r2"], t, rteams)  # old: blended R2 by record
    return eng.DraftOrder.from_lists(r1_final, r2)

eng.apply_lottery = legacy_apply_lottery
eng.generate_order = legacy_generate_order

eng.run_monte_carlo(
    data_dir="public/pick-data/teams",
    baseline_csv="public/relics/future_draft_orders.csv",
    n_sims=100000,
    output_dir="/tmp/sim_old_lottery",
)
print("LEGACY RUN DONE -> /tmp/sim_old_lottery")
