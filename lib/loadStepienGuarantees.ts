import fs from "fs";
import path from "path";

// One record per (team, year), emitted by engine_v2.py's build_stepien_output.
//   guaranteed_count — first-round picks held in EVERY simulated outcome (the
//                      Stepien-guaranteed floor). >=1 satisfies the rule for that
//                      year; >=2 means a spare that can be traded.
//   hold_prob        — fraction of sims holding >=1 first; distinguishes a
//                      conditional/protected year (0 < p < 1) from a true gap (0).
//   pair_floor_next  — min of (firsts this year + firsts next year) across sims;
//                      >=1 means the (year, year+1) pair is never both empty, so
//                      two protected years can be jointly Stepien-safe. null for
//                      the final year (no following year to pair with).
export type StepienGuarantee = {
    team: string;
    year: number;
    guaranteed_count: number;
    hold_prob: number;
    pair_floor_next: number | null;
};

export function loadStepienGuarantees(): StepienGuarantee[] {
    const filePath = path.join(process.cwd(), "public", "sim-output", "stepien_guarantees.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as StepienGuarantee[];
}
