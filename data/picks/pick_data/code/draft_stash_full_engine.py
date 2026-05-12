import os
import csv
import pandas as pd
import order_generator as gen
import draft_engine as de
import json
from pathlib import Path

"""
draft_stash_full_engine.py

FINAL FILE
- Runs Monte Carlo sims
- Outputs clean, owner-conditional valuation data
"""

# =========================================================
# run sim
# =========================================================
def run_single_sim(sim_number, all_picks):
    temp_orders = f".tmp_orders_sim_{sim_number}.csv"
    gen.export_future_orders_csv(path=temp_orders)

    draft_df = pd.read_csv(temp_orders)

    engine = de.PickEngine(all_picks, de.PELTON_CURVE)

    orders_by_year = {
        year: de.DraftOrder(draft_df, year)
        for year in draft_df["year"].unique()
    }

    rows = []

    for pick_id, pick in all_picks.items():
        year = pick["year"]
        order = orders_by_year[year]

        try:
            res = engine.resolve_pick(pick, order)
            info = list(res.values())[0]

            team_abbr = de.TEAM_MAP[pick["original_team"]]
            rnd = pick["round"]
            pos = order.position_of(team_abbr, rnd)

            if rnd == 1:
                overall_pos = pos
            else:
                overall_pos = 91 - pos  # FIX reversed round-2 ordering

            if overall_pos not in de.PELTON_CURVE:
                raise ValueError(f"Bad overall_pos={overall_pos} (pos={pos}, rnd={rnd}) for {pick_id}")

            pelton_value = de.PELTON_CURVE[overall_pos]
            display_pos = overall_pos

            rows.append([
                sim_number,
                pick_id,
                year,
                pick["round"],
                pick["original_team"],
                pick["rules"]["type"],
                info["owner"],
                pelton_value,
                display_pos,
                True
            ])

        except Exception as e:
            print(f"[FAIL] pick_id={pick_id} → {e}")
            rows.append([
                sim_number,
                pick_id,
                year,
                pick.get("round"),
                pick.get("original_team"),
                pick.get("rules", {}).get("type"),
                None,
                None,
                None,
                False
            ])

    os.remove(temp_orders)
    return rows


# =========================================================
# build master sheets
# =========================================================
def build_master_outputs(
    raw_csv="sim_raw_results.csv",
    dist_csv="ownership_distribution.csv",
    json_folder=None # Added to allow rule-fetching
):
    raw = pd.read_csv(raw_csv)
    dist = pd.read_csv(dist_csv)

    resolved = raw[raw["resolved"] == True]

    # ----------------------------
    # PICK-LEVEL VALUE STATS
    # ----------------------------
    pick_value_stats = (
        resolved
        .groupby("pick_id")["value"]
        .agg(
            EV="mean",
            value_std="std",
            min_value="min",
            max_value="max",
            p10=lambda x: x.quantile(0.10),
            p25=lambda x: x.quantile(0.25),
            p50=lambda x: x.quantile(0.50),
            p75=lambda x: x.quantile(0.75),
            p90=lambda x: x.quantile(0.90),
        )
        .reset_index()
    )

    # ----------------------------
    # EXPECTED DRAFT SLOT (DISPLAY ONLY)
    # ----------------------------
    expected_slot = (
        resolved
        .groupby("pick_id")["draft_position"]
        .mean()
        .reset_index()
        .rename(columns={"draft_position": "expected_draft_slot"})
    )

    # ----------------------------
    # RESOLUTION RATE
    # ----------------------------
    resolution = (
        raw.groupby("pick_id")["resolved"]
        .mean()
        .reset_index()
        .rename(columns={"resolved": "resolution_rate"})
    )

    # ----------------------------
    # OWNER-CONDITIONAL IMPLIED VALUE
    # ----------------------------
    owner_implied_value = (
        resolved
        .groupby(["pick_id", "owner"])["value"]
        .mean()
        .reset_index()
        .rename(columns={"value": "implied_value"})
    )

    owner_implied_value.to_csv(
        "pick_owner_implied_values.csv",
        index=False
    )

    # ----------------------------
    # OWNERSHIP PROBS
    # ----------------------------
    owner_probs = (
        dist
        .rename(columns={"prob": "ownership_prob"})
    )
    
    # ----------------------------
    # OWNER SLOTS (WIDE FORMAT)
    # ----------------------------
    owner_slots = (
        owner_probs
        .sort_values(["pick_id", "ownership_prob"], ascending=[True, False])
        .groupby("pick_id")
        .head(4)
        .assign(slot=lambda df: df.groupby("pick_id").cumcount() + 1)
    )

    owner_wide = owner_slots.pivot(
        index="pick_id",
        columns="slot",
        values=["owner", "ownership_prob"]
    )

    owner_wide.columns = [
        f"{col}_{slot}" for col, slot in owner_wide.columns
    ]

    owner_wide = owner_wide.reset_index()


    # ----------------------------
    # STATIC PICK INFO + RULES FIX
    # ----------------------------
    static = (
        raw.drop_duplicates("pick_id")
        [["pick_id", "year", "round", "original_team", "pick_type"]]
    )

    # Injects the actual rules metadata from original JSONs
    if json_folder:
        all_rules = {}
        for f in Path(json_folder).glob("*.json"):
            try:
                with open(f) as infile:
                    data = json.load(infile)
                    all_rules[data["pick_id"]] = json.dumps(data.get("rules", {}))
            except:
                continue
        static["rules"] = static["pick_id"].map(all_rules)

    # ----------------------------
    # MASTER PICK SHEET
    # ----------------------------
    master_picks = (
        static
        .merge(pick_value_stats, on="pick_id", how="left")
        .merge(expected_slot, on="pick_id", how="left")
        .merge(resolution, on="pick_id", how="left")
        .merge(owner_wide, on="pick_id", how="left")
    )

    master_picks.to_csv("master_picks.csv", index=False)

    print("✓ Saved master_picks.csv")
    print("✓ Saved pick_owner_implied_values.csv")


# =========================================================
# monte carlo engine
# =========================================================
def run_monte_carlo(
    json_folder,
    sims=10000,
    output_raw="sim_raw_results.csv",
    output_dist="ownership_distribution.csv"
):
    all_picks, _ = de.load_all_picks(json_folder)

    master_rows = []

    print(f"Running {sims} simulations…")

    for sim in range(1, sims + 1):
        print(f" → Sim {sim}/{sims}")
        master_rows.extend(run_single_sim(sim, all_picks))

    # ----------------------------
    # RAW OUTPUT
    # ----------------------------
    with open(output_raw, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "sim", "pick_id", "year", "round",
            "original_team", "pick_type",
            "owner", "value",
            "draft_position", "resolved"
        ])
        w.writerows(master_rows)

    print(f"✓ Saved {output_raw}")

    df = pd.read_csv(output_raw)

    # ----------------------------
    # OWNERSHIP DISTRIBUTION
    # ----------------------------
    dist_df = (
        df[df["resolved"] == True]
        .groupby(["pick_id", "owner"], as_index=False)
        .size()
        .rename(columns={"size": "count"})
    )

    dist_df["prob"] = dist_df["count"] / sims
    dist_df = dist_df[["pick_id", "owner", "prob"]]

    dist_df.to_csv(output_dist, index=False)

    print(f"✓ Saved {output_dist}")


# =========================================================
# RUN
# =========================================================
if __name__ == "__main__":
    pick_path = "/Users/williamdeandre/Desktop/picks"
    
    run_monte_carlo(
        json_folder=pick_path,
        sims=10000
    )

    build_master_outputs(json_folder=pick_path)