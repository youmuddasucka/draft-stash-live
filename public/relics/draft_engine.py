from pathlib import Path
import json

'''
draft_engine.py

INTERMEDIATE FILE: DO NOT CHANGE

this file resolves the draft orders that are given to it

contains resolve logic for each pick type

'''

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
    "Washington Wizards": "WAS"
}

ABBR_MAP = {v: k for k, v in TEAM_MAP.items()}


# ===============================================================
# DRAFT ORDER OBJECT
# ===============================================================

VALUE_CURVE = {
    1: 1.0, 2: 0.84007, 3: 0.7516, 4: 0.6895, 5: 0.64183,
    6: 0.60223, 7: 0.56745, 8: 0.53702, 9: 0.50913, 10: 0.48013,
    11: 0.45108, 12: 0.42505, 13: 0.4007, 14: 0.37892, 15: 0.35868,
    16: 0.34123, 17: 0.32595, 18: 0.31275, 19: 0.29943, 20: 0.28758,
    21: 0.27428, 22: 0.26237, 23: 0.24967, 24: 0.2383, 25: 0.22705,
    26: 0.21682, 27: 0.20703, 28: 0.19608, 29: 0.18613, 30: 0.17563,
    31: 0.15018, 32: 0.14385, 33: 0.13697, 34: 0.1311, 35: 0.125,
    36: 0.11983, 37: 0.11443, 38: 0.1097, 39: 0.10373, 40: 0.0994,
    41: 0.0951, 42: 0.09053, 43: 0.08663, 44: 0.0824, 45: 0.07825,
    46: 0.0741, 47: 0.06998, 48: 0.0659, 49: 0.06215, 50: 0.05815,
    51: 0.05445, 52: 0.05108, 53: 0.04745, 54: 0.0435, 55: 0.03955,
    56: 0.0369, 57: 0.03333, 58: 0.02947, 59: 0.02625, 60: 0.02242
}

class DraftOrder:
    def __init__(self, draft_orders_df, year):
        df = draft_orders_df[draft_orders_df["year"] == year]

        # Store all positions for each team:
        # Example: { "PHI": {1: 30, 2: 59}, ... }
        self.positions = {}

        for _, row in df.iterrows():
            team = row["team"]
            pick_number = int(row["pick"])    # 1–60

            # Determine round automatically
            rnd = 1 if pick_number <= 30 else 2

            if team not in self.positions:
                self.positions[team] = {}
            self.positions[team][rnd] = pick_number

    def position_of(self, team_abbrev, rnd):
        return self.positions[team_abbrev][rnd]

# ===============================================================
# PICK ENGINE
# ===============================================================

class PickEngine:
    
    def get_swap_metadata(self, pick):
        """
        Returns the mf/lf allocation list specifically for the frontend.
        """
        rule = pick.get("rules", {})
        if rule.get("type") != "swap":
            return None
        
        # This ensures that your 'rules' object in the CSV 
        # will definitely have the allocation array you're looking for.
        return rule.get("allocation", [])

    def __init__(self, all_picks, value_curve, base_year=2025):
        """
        all_picks: dict[pick_id] -> pick JSON object
        value_curve: dict or list that maps 1..60 -> value
        base_year: starting point for discounting (your simulations use 2025)
        """
        self.all_picks = all_picks
        self.value_curve = value_curve
        self.base_year = base_year

    # ------------------------------------------
    # Utility
    # ------------------------------------------
    
    def normalize_pool_entry(self, entry):
        # Case A: plain string → treat as pick_id
        if isinstance(entry, str):
            return {
                "type": "pick",
                "pick_id": entry,
                "range": None
            }

        # Case B: dict type → must have "pick" and "condition"
        if isinstance(entry, dict):
            if "pick" in entry and "condition" in entry:
                r = entry["condition"].get("range")
                if isinstance(r, list) and len(r) == 2:
                    a, b = r
                    if isinstance(a, int) and isinstance(b, int):
                        return {
                            "type": "protected_pick",
                            "pick_id": entry["pick"],
                            "range": (a, b)
                        }

        raise ValueError(f"Malformed pool entry: {entry}")
    
    def get_position(self, team, order, rnd):
        """
        Return the draft position (1–60) for a team.
        Accepts either full team name or abbreviation.
        """
        team_abbr = TEAM_MAP.get(team, team)

        if team_abbr not in order.positions:
            raise ValueError(f"Team '{team}' not found in draft order.")

        if rnd not in order.positions[team_abbr]:
            raise ValueError(f"Team '{team}' missing round {rnd}.")

        return order.positions[team_abbr][rnd]

    def draft_value(self, pick, order):
        team = TEAM_MAP[pick["original_team"]]
        rnd = pick["round"]

        position = order.position_of(team, rnd)

        if rnd == 2:
            position = 91 - position

        raw = self.value_curve[position]

        years_ahead = max(0, pick["year"] - 2026)
        return raw * (0.98 ** years_ahead)


    # ------------------------------------------
    # 0. Frozen
    # ------------------------------------------

    def resolve_frozen(self, pick):
        return {
            pick["pick_id"]: {
                "owner": pick["original_team"],
                "value": 0.15
            }
        }

    # ------------------------------------------
    # 1. Unprotected
    # ------------------------------------------

    def resolve_unprotected(self, pick, order):
        owner = pick["rules"]["owner"]
        return {
            pick["pick_id"]: {
                "owner": owner,
                "value": self.draft_value(pick, order)
            }
        }

    # ------------------------------------------
    # 2. Protected
    # ------------------------------------------

    def resolve_protected(self, pick, order):
        a, b = pick["rules"]["protection_range"]
        team_abbr = TEAM_MAP[pick["original_team"]]
        rnd = pick["round"]

        # FULL NAME, no abbreviations
        pos = order.position_of(team_abbr, rnd)

        if a <= pos <= b:
            owner = pick["rules"]["if_protected_to"]
        else:
            owner = pick["rules"]["if_not_protected_to"]

        return {
            pick["pick_id"]: {
                "owner": owner,
                "value": self.draft_value(pick, order)
            }
        }

    # ------------------------------------------
    # 3. Conditional Trigger
    # ------------------------------------------

    def resolve_protection_backup(self, pick, order):
        rule = pick["rules"]
        results = []

        for trig in rule["triggers"]:
            pid = trig["pick_id"]
            a, b = trig["condition"]["range"]

            orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
            rnd = self.all_picks[pid]["round"]
            
            pos = order.position_of(orig_abbr, rnd)

            results.append(a <= pos <= b)

        if rule["trigger_logic"] == "ALL":
            triggered = all(results)
        elif rule["trigger_logic"] == "ANY":
            triggered = any(results)
        else:
            raise Exception(f"Unknown trigger_logic: {rule['trigger_logic']}")

        owner = rule["if_triggered_to"] if triggered else rule["if_not_triggered_to"]

        return {
            pick["pick_id"]: {
                "owner": owner,
                "value": self.draft_value(pick, order)
            }
        }

    # ------------------------------------------
    # 4. Swap (mf / lf)
    # ------------------------------------------

    def resolve_swap(self, pick, order):
        """Return ONLY the owner of THIS pick."""
        rule = pick["rules"]
        pool = rule["pool"]

        # -----------------------------
        # Step 1 — Build pool_info
        # -----------------------------
        pool_info = []

        for raw in pool:
            item = self.normalize_pool_entry(raw)
            pid = item["pick_id"]

            # Protected pick → apply condition
            if item["type"] == "protected_pick":
                a, b = item["range"]
                orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
                rnd = self.all_picks[pid]["round"]          # 1 or 2

                # FULL NAME, no abbreviation
                pos = order.position_of(orig_abbr, rnd)

                # Blocked → skip
                if not (a <= pos <= b):
                    continue

            # Add usable pick
            orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
            rnd = self.all_picks[pid]["round"]
            pos = order.position_of(orig_abbr, rnd)

            pool_info.append((pid, pos))

        # Sort best → worst
        pool_info.sort(key=lambda x: x[1])
        N = len(pool_info)

        if N == 0:
            raise Exception("Swap pool collapsed to size 0.")

        # -----------------------------
        # Step 2 — target pick index
        # -----------------------------
        target_id = pick["pick_id"]

        target_index = None
        for idx, (pid, _) in enumerate(pool_info):
            if pid == target_id:
                target_index = idx
                break

        if target_index is None:
            raise Exception(f"Target pick {target_id} not found in evaluated pool.")

        # -----------------------------
        # Step 3 — rank mapping
        # -----------------------------
        def rank_to_index(rank, N):
            if N == 2:
                return {"mf":0, "lf":1}[rank]

            if N == 3:
                return {"mf":0, "mid":1, "lf":2}[rank]

            if N == 4:
                return {"mf":0, "mid1":1, "mid2":2, "lf":3}[rank]

            raise Exception(f"Unsupported pool size {N}")

        # -----------------------------
        # Step 4 — apply allocations
        # -----------------------------
        for block in rule["allocation"]:
            desired = rank_to_index(block["rank"], N)

            if target_index == desired:
                owner = block["to"]
                return {
                    target_id: {
                        "owner": owner,
                        "value": self.draft_value(pick, order)
                    }
                }

        raise Exception(f"No allocation matched target pick {target_id}")

    # ------------------------------------------
    # 5. Nested Swap
    # ------------------------------------------

    def resolve_nested_swap(self, pick, order):
        rule = pick["rules"]
        target_id = pick["pick_id"]
        temp_map = {}

        for level in rule["levels"]:
            pool = []

            for raw in level["pool"]:

                # TEMP placeholders
                if isinstance(raw, str) and raw.startswith("TEMP_"):
                    if raw not in temp_map:
                        raise Exception(f"Unresolved TEMP {raw}")
                    pool.append(temp_map[raw])
                    continue

                # Normalize entry
                item = self.normalize_pool_entry(raw)
                pid = item["pick_id"]

                # ---- Protected pick condition ----
                if item["type"] == "protected_pick":
                    a, b = item["range"]

                    orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
                    rnd = self.all_picks[pid]["round"]      # 1 or 2

                    # FULL TEAM NAME
                    pos = order.position_of(orig_abbr, rnd)
                    # Blocked (skip)
                    if not (a <= pos <= b):
                        continue

                    pool.append(pid)

                else:
                    # Plain pick
                    pool.append(pid)

            # ---------------------------------------
            # Build pool_info (pid, real draft number)
            # ---------------------------------------
            pool_info = []
            for pid in pool:
                orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
                rnd = self.all_picks[pid]["round"]

                # FULL NAME
                pos = order.position_of(orig_abbr, rnd)
                pool_info.append((pid, pos))

            if not pool_info:
                # If an entire level collapses, continue to next level
                continue

            pool_info.sort(key=lambda x: x[1])  # best → worst
            N = len(pool_info)

            # ---------------------------------------
            # Apply allocations in this level
            # ---------------------------------------
            for block in level["allocation"]:
                rank = block["rank"]
                dest = block["to"]

                # mf = best (index 0), lf = worst (index N-1)
                idx = 0 if rank == "mf" else N - 1
                assigned_pid = pool_info[idx][0]

                # TEMP storage
                if dest.startswith("TEMP_"):
                    temp_map[dest] = assigned_pid
                else:
                    # If this level assigns *our target pick*, return NOW
                    if assigned_pid == target_id:
                        return {
                            target_id: {
                                "owner": dest,
                                "value": self.draft_value(
                                    pick, order
                                )
                            }
                        }

        # ---------------------------------------
        # FINAL FALLBACKS
        # ---------------------------------------

        # (1) Protected fallback
        if "if_protected_to" in rule:
            return {
                target_id: {
                    "owner": rule["if_protected_to"],
                    "value": self.draft_value(
                        pick, order
                    )
                }
            }

        # (2) Default: original owner keeps the pick
        orig = pick["original_team"]
        return {
            target_id: {
                "owner": orig,
                "value": self.draft_value(pick, order)
            }
        }


    # ------------------------------------------
    # 6. Protected Swap
    # ------------------------------------------

    def resolve_protected_swap(self, pick, order):
        rule = pick["rules"]
        target_id = pick["pick_id"]

        # -----------------------------
        # 1. Build pool
        # -----------------------------
        pool = []
        protected_blocked = False

        for raw in rule["pool"]:
            item = self.normalize_pool_entry(raw)
            pid = item["pick_id"]

            # Protected pick entry
            if item["type"] == "protected_pick":
                a, b = item["range"]

                orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
                rnd = self.all_picks[pid]["round"]    # 1 or 2

                # FULL TEAM NAME lookup
                pos = order.position_of(orig_abbr, rnd)

                if a <= pos <= b:
                    pool.append(pid)
                else:
                    protected_blocked = True

            else:
                # Normal pick
                pool.append(pid)

        # -----------------------------
        # 2. All protected entries blocked → fallback
        # -----------------------------
        if protected_blocked and len(pool) == 0:
            orig = pick["original_team"]
            return {
                target_id: {
                    "owner": orig,
                    "value": self.draft_value(pick, order)
                }
            }

        # -----------------------------
        # 3. Apply swap normally
        # -----------------------------
        pool_info = []
        for pid in pool:
            orig_abbr = TEAM_MAP[self.all_picks[pid]["original_team"]]
            rnd = self.all_picks[pid]["round"]

            pos = order.position_of(orig_abbr, rnd)
            pool_info.append((pid, pos))

        # Best → worst
        pool_info.sort(key=lambda x: x[1])
        N = len(pool_info)

        # -----------------------------
        # 4. Identify target pick index
        # -----------------------------
        target_index = None
        for idx, (pid, _) in enumerate(pool_info):
            if pid == target_id:
                target_index = idx
                break

        # Target fell out of evaluated pool → fallback
        if target_index is None:
            orig = pick["original_team"]
            return {
                target_id: {
                    "owner": orig,
                    "value": self.draft_value(pick, order)
                }
            }

        # -----------------------------
        # 5. Apply allocations
        # -----------------------------
        for block in rule["allocation"]:
            rank = block["rank"]
            dest = block["to"]

            # mf = best, lf = worst
            desired_index = 0 if rank == "mf" else N - 1

            if target_index == desired_index:
                return {
                    target_id: {
                        "owner": dest,
                        "value": self.draft_value(pick, order)
                    }
                }

        # -----------------------------
        # 6. FINAL FALLBACK: original owner
        # -----------------------------
        orig = pick["original_team"]
        return {
            target_id: {
                "owner": orig,
                "value": self.draft_value(pick, order)
            }
        }

    # ------------------------------------------
    # MAIN DISPATCH
    # ------------------------------------------
    
    def apply_detroit_2028_utah_override(self, resolved, order):
        """
        Detroit → Utah 2028 worst 2nd logic.
        resolved: dict[pick_id] -> {"owner": str, "value": float}
        Mutates resolved in-place.
        """

        CANDIDATES = [
            "Detroit_Pistons_2028_2",
            "Charlotte_Hornets_2028_2",
            "Los_Angeles_Clippers_2028_2",
            "Miami_Heat_2028_2",
            "New_York_Knicks_2028_2",
        ]

        eligible = []

        for pid in CANDIDATES:
            if pid not in resolved:
                continue

            pick = self.all_picks[pid]
            rnd = pick["round"]
            team_abbr = TEAM_MAP[pick["original_team"]]
            pos = order.position_of(team_abbr, rnd)

            # (i) Detroit protected 56–60 → EXCLUDE
            if pid == "Detroit_Pistons_2028_2" and 56 <= pos <= 60:
                continue

            # (iii) Miami only if DAL 2027 1st conveyed
            if pid == "Miami_Heat_2028_2":
                dal_pick = self.all_picks["Dallas_Mavericks_2027_1"]
                dal_abbr = TEAM_MAP[dal_pick["original_team"]]
                dal_pos = order.position_of(dal_abbr, dal_pick["round"])

                # 1–2 = did NOT convey → Miami excluded
                if 1 <= dal_pos <= 2:
                    continue

            eligible.append((pid, pos))

        if not eligible:
            return

        # Worst = highest pick number
        worst_pid = max(eligible, key=lambda x: x[1])[0]

        resolved[worst_pid]["owner"] = "Utah Jazz"


    def resolve_pick(self, pick, order):
        rtype = pick["rules"]["type"]

        if pick["frozen"]:
            return self.resolve_frozen(pick)

        if rtype == "unprotected":
            return self.resolve_unprotected(pick, order)

        if rtype == "protected":
            return self.resolve_protected(pick, order)

        if rtype == "protection_backup":
            return self.resolve_protection_backup(pick, order)

        if rtype == "swap":
            return self.resolve_swap(pick, order)

        if rtype == "nested_swap":
            return self.resolve_nested_swap(pick, order)

        if rtype == "protected_swap":
            return self.resolve_protected_swap(pick, order)

        raise Exception(f"Unknown pick rule type: {rtype}")


# ===============================================================
# LOADING FUNCTIONS
# ===============================================================

def load_all_picks(folder):
    out = {}
    broken_files = []
    unprocessed = []

    for f in Path(folder).glob("*.json"):
        try:
            with open(f) as infile:
                data = json.load(infile)

            # Track unprocessed
            if data.get("pick_status") == "unprocessed":
                unprocessed.append(data["pick_id"])

            out[data["pick_id"]] = data

        except Exception as e:
            print(f"⚠️  Skipping broken JSON file: {f.name}")
            print(f"    Error: {e}")
            broken_files.append(f)

    print(f"\nLoaded {len(out)} valid JSON files.")
    print(f"Skipped {len(broken_files)} broken JSONs.")
    print(f"Found {len(unprocessed)} unprocessed picks.\n")

    return out, unprocessed