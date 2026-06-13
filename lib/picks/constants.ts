export const TEAM_FOLDER: Record<string, string> = {
    ATL: "atlanta",        BOS: "boston",         BKN: "brooklyn",
    CHA: "charlotte",      CHI: "chicago",        CLE: "cleveland",
    DAL: "dallas",         DEN: "denver",         DET: "detroit",
    GSW: "golden_state",   HOU: "houston",        IND: "indiana",
    LAC: "los_angeles_clippers", LAL: "los_angeles_lakers",
    MEM: "memphis",        MIA: "miami",          MIL: "milwaukee",
    MIN: "minnesota",      NOP: "new_orleans",    NYK: "new_york",
    OKC: "oklahoma_city",  ORL: "orlando",        PHI: "philadelphia",
    PHX: "phoenix",        POR: "portland",       SAC: "sacramento",
    SAS: "san_antonio",    TOR: "toronto",        UTA: "utah",
    WAS: "washington",
};

export const SWAP_POS_COLOR: Record<string, string> = {
    "SWAP BEST":  "#22c55e",
    "SWAP MID":   "#f59e0b",
    "SWAP WORST": "#ef4444",
};

export const PICK_TYPE_INFO: Record<string, { label: string; tag: string; borderColor: string; description: string }> = {
    unprotected: {
        label: "Unprotected", tag: "CONVEYS ALWAYS", borderColor: "#E6B85C",
        description: "This pick conveys unconditionally — no lottery protection, no swap conditions, no outs. Whoever holds this right receives the pick regardless of where the team lands in the draft.",
    },
    unpro_swap: {
        label: "Unprotected Swap", tag: "SWAP", borderColor: "#a855f7",
        description: "An unprotected swap right. The holder compares the picks in the pool and takes whichever lands in the best draft position. No conditions required — the swap is always exercisable.",
    },
    pro_swap: {
        label: "Protected Swap", tag: "SWAP · PROTECTED", borderColor: "#a855f7",
        description: "A protected swap right. The holder can only take the better pick if specific draft-position conditions are met. If the protection triggers, each team keeps their own pick.",
    },
    cond_alloc_swap: {
        label: "Conditional Swap", tag: "SWAP · CONDITIONAL", borderColor: "#a855f7",
        description: "A swap where the picks are ranked and the more favorable conveys outright, but the less-favorable pick's destination depends on where it lands — a protection on the conveyance itself rather than on a specific pick entering the pool.",
    },
    pro_pick: {
        label: "Protected Pick", tag: "PROTECTED", borderColor: "#3b82f6",
        description: "This pick has lottery protection. It only conveys to the holder if it falls outside a specified range. If it lands in the protected zone, the original team keeps it and the pick rolls over or triggers a backup.",
    },
    pro_backup: {
        label: "Backup Pick", tag: "BACKUP", borderColor: "#3b82f6",
        description: "A backup pick that activates if the primary protected pick never fully conveyed. After a certain number of years of protection, this pick is sent instead.",
    },
    unpro_backup: {
        label: "Unprotected Backup", tag: "BACKUP", borderColor: "#3b82f6",
        description: "A backup pick with no additional protection. Conveys automatically if the primary pick triggered the backup clause.",
    },
    pro_backup_branched: {
        label: "Branched Backup", tag: "BACKUP · BRANCHED", borderColor: "#3b82f6",
        description: "A multi-path backup pick. The original pick had multiple protection windows and branching conditions. This pick conveys under one of several possible resolution scenarios.",
    },
    nested_swap: {
        label: "Nested Swap", tag: "SWAP · NESTED", borderColor: "#a855f7",
        description: "A swap right that is conditional on the outcome of another swap. Part of a layered multi-team arrangement — whether this swap can even be exercised depends on how a prior swap resolved.",
    },
    triple_swap: {
        label: "Triple Swap", tag: "SWAP · 3-WAY", borderColor: "#ec4899",
        description: "A three-team swap right. The holder takes the best pick among three participating teams. All three picks are linked and resolve simultaneously.",
    },
    pro_triple_swap: {
        label: "Protected Triple Swap", tag: "SWAP · 3-WAY · PROTECTED", borderColor: "#ec4899",
        description: "A protected three-team swap. The holder gets the best pick among three teams only if certain draft-position conditions are met.",
    },
    special: {
        label: "Special", tag: "SPECIAL", borderColor: "#6b7280",
        description: "This pick has a non-standard structure with custom or unusual conditions not captured by standard pick type classifications.",
    },
};
