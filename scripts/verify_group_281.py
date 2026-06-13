"""
Validation harness for the 2028 R1 mega-swap (swap_group 281brknykphiphxwasmilpor).

Compares the current engine solver (resolve_group_281) against a reference
implementation written directly from realGMmay8th2.txt lines 480 + 587.

Teams: B=Brooklyn P=Philadelphia(prot 1-8) X=Phoenix N=New York
       W=Washington M=Milwaukee R=Portland
Lower position = more favorable.
"""
import random

OWNER = {
    "B": "Brooklyn Nets", "P": "Philadelphia 76ers", "X": "Phoenix Suns",
    "N": "New York Knicks", "W": "Washington Wizards",
    "M": "Milwaukee Bucks", "R": "Portland Trail Blazers",
}


# ─────────────────────────────────────────────────────────────────────────────
# REFERENCE — faithful to realGM line 480 (main) + 587 (secondary)
# ─────────────────────────────────────────────────────────────────────────────
def reference_281(pos):
    res = {}
    phi_conv = 9 <= pos["P"] <= 30

    # ── Main pool ──
    main = ["B", "X", "N"] + (["P"] if phi_conv else [])
    s = sorted(main, key=lambda t: pos[t])           # most favorable first

    # Brooklyn
    if phi_conv:
        phi_third = s[2] == "P"
        nyk_top2 = s[0] == "N" or s[1] == "N"
        if phi_third and nyk_top2:
            bkn = [s[0], s[2]]                        # most + third most favorable
        else:
            bkn = [s[0], s[1]]                        # two most favorable
    else:
        bkn = [s[0]]                                 # most favorable
        res["P"] = OWNER["P"]                         # PHI protected → stays home
    for t in bkn:
        res[t] = OWNER["B"]

    # New York — over {N, B, X}
    s3 = sorted(["N", "B", "X"], key=lambda t: pos[t])
    n_worst = pos["N"] > pos["B"] and pos["N"] > pos["X"]
    nyk = s3[-1] if (phi_conv or n_worst) else s3[1]
    if nyk in res:
        # collision means our reading partitions wrong — surface it
        return {"__error__": f"NYK collision nyk={nyk} pos={pos}"}
    res[nyk] = OWNER["N"]

    # Leftover main-pool pick = "least/less favorable of {P(if conv), B, X}"
    leftover = [t for t in main if t not in res]
    if len(leftover) != 1:
        return {"__error__": f"leftover={leftover} pos={pos}"}
    cand = leftover[0]

    # Washington main vs Phoenix: WAS gets more favorable of {WAS own, cand}
    if pos["W"] <= pos[cand]:
        was_main = "W"
        res[cand] = OWNER["X"]      # Phoenix gets the less favorable (cand)
    else:
        was_main = cand
        res["W"] = OWNER["X"]       # Phoenix gets the less favorable (WAS own)

    # ── Secondary swap (line 587) ──
    # Portland gets more favorable of {POR own, MIL own}; lf is the other.
    if pos["R"] <= pos["M"]:
        res["R"] = OWNER["R"]
        lf_mp = "M"
    else:
        res["M"] = OWNER["R"]
        lf_mp = "R"

    # WAS final: more favorable of {was_main, lf_mp}; MIL gets the less favorable.
    if pos[was_main] <= pos[lf_mp]:
        res[was_main] = OWNER["W"]
        res[lf_mp] = OWNER["M"]
    else:
        res[lf_mp] = OWNER["W"]
        res[was_main] = OWNER["M"]

    return res


# ─────────────────────────────────────────────────────────────────────────────
# SOLVER — replicate scripts/special_picks_solver.py::resolve_group_281 exactly
# ─────────────────────────────────────────────────────────────────────────────
def solver_281(pos):
    res = {}
    phi_enters = 9 <= pos["P"] <= 30
    main_pool = ["B", "X", "N"]
    if phi_enters:
        main_pool.append("P")
    else:
        res["P"] = OWNER["P"]

    sp = sorted(main_pool, key=lambda t: pos[t])
    N = len(sp)
    res[sp[0]] = OWNER["B"]
    res[sp[1]] = OWNER["B"]
    res[sp[N - 1]] = OWNER["X"]

    if N == 4:
        was_cmp = sp[2]
        avail = True
    else:
        was_cmp = None
        avail = False

    was_pos = pos["W"]
    if avail:
        if was_pos < pos[was_cmp]:
            res["W"] = OWNER["W"]
        else:
            res[was_cmp] = OWNER["W"]
    else:
        res["W"] = OWNER["W"]

    if pos["M"] < pos["R"]:
        mf, lf = "M", "R"
    else:
        mf, lf = "R", "M"
    res[mf] = OWNER["R"]

    if was_pos < pos[lf]:
        res[lf] = OWNER["M"]
    else:
        res[lf] = OWNER["W"]
        res["W"] = OWNER["M"]

    for k in OWNER:
        if k not in res:
            res[k] = OWNER[k]
    return res


def valid_partition(res):
    if "__error__" in res:
        return False, res["__error__"]
    if set(res.keys()) != set(OWNER):
        return False, f"missing keys: {set(OWNER) - set(res.keys())}"
    owners = list(res.values())
    # Each of the 7 picks has exactly one owner; owners must be among the group
    # (Philadelphia only if it stayed home).
    return True, None


def run(n=200000, seed=0):
    rnd = random.Random(seed)
    teams = list(OWNER)
    diffs = 0
    ref_bad = 0
    sol_bad = 0
    examples = []
    counts_ref = {k: {v: 0 for v in set(OWNER.values()) | {OWNER["P"]}} for k in OWNER}
    for _ in range(n):
        positions = rnd.sample(range(1, 31), 7)
        pos = dict(zip(teams, positions))
        ref = reference_281(pos)
        sol = solver_281(pos)
        okr, errr = valid_partition(ref)
        oks, errs = valid_partition(sol)
        if not okr:
            ref_bad += 1
            if len(examples) < 5:
                examples.append(("REF_INVALID", pos, errr, None))
            continue
        if not oks:
            sol_bad += 1
        for k in OWNER:
            counts_ref[k][ref[k]] += 1
        if ref != sol:
            diffs += 1
            if len(examples) < 12:
                d = {k: (ref[k].split()[0], sol[k].split()[0]) for k in OWNER if ref[k] != sol[k]}
                examples.append(("DIFF", pos, d, None))
    print(f"samples={n}  diffs={diffs} ({100*diffs/n:.2f}%)  ref_invalid={ref_bad}  sol_invalid={sol_bad}")
    print("\n-- example divergences (pos, {pick: (reference, solver)}) --")
    for tag, pos, d, _ in examples:
        ordered = sorted(pos.items(), key=lambda x: x[1])
        order_str = " ".join(f"{t}{p}" for t, p in ordered)
        print(f"  [{tag}] {order_str}")
        print(f"          {d}")
    print("\n-- reference ownership distribution (per source pick) --")
    for k in OWNER:
        dist = {o.split()[0]: round(100 * c / (n - ref_bad), 1) for o, c in counts_ref[k].items() if c}
        print(f"  {k} ({OWNER[k].split()[0]}): {dist}")


if __name__ == "__main__":
    run()
