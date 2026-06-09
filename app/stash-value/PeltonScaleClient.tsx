"use client";

import { useState, useMemo } from "react";
import {
    LineChart, Line, BarChart, Bar, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    ReferenceLine, ReferenceArea,
} from "recharts";
// Real Pick mode — kept for future use, currently hidden
// import type { PickSummary } from "./page";

const CURRENT_YEAR = 2026;

/* ─── PELTON CURVE ──────────────────────────────────────── */
const PELTON_CURVE: Record<number, number> = {
    1: 1.0,    2: 0.775,  3: 0.6675, 4: 0.6025, 5: 0.56,
    6: 0.5275, 7: 0.5,    8: 0.4775, 9: 0.4575, 10: 0.43,
    11: 0.4,   12: 0.375, 13: 0.35,  14: 0.33,  15: 0.31,
    16: 0.295, 17: 0.2825,18: 0.27,  19: 0.2575,20: 0.245,
    21: 0.23,  22: 0.215, 23: 0.2,   24: 0.1875,25: 0.175,
    26: 0.165, 27: 0.155, 28: 0.1425,29: 0.13,  30: 0.1175,
    31: 0.09,  32: 0.0875,33: 0.0825,34: 0.08,  35: 0.075,
    36: 0.0725,37: 0.07,  38: 0.0675,39: 0.0625,40: 0.06,
    41: 0.0575,42: 0.055, 43: 0.0525,44: 0.05,  45: 0.0475,
    46: 0.045, 47: 0.0425,48: 0.04,  49: 0.0375,50: 0.035,
    51: 0.0325,52: 0.03,  53: 0.0275,54: 0.025, 55: 0.0225,
    56: 0.0225,57: 0.02,  58: 0.0175,59: 0.015, 60: 0.0125,
};

const peltonData = Object.entries(PELTON_CURVE).map(([k, v]) => ({
    pick: Number(k), value: v * 100,
}));
const X_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

/* ─── VALUE COLOR ────────────────────────────────────────── */
function valueColor(v: number): string {
    if (v >= 77.5) return "#D4AF37";
    if (v >= 50)   return "#14532d";
    if (v >= 40)   return "#16a34a";
    if (v >= 28)   return "#4ade80";
    if (v >= 18)   return "#86efac";
    if (v >= 12)   return "#d1fae5";
    if (v >= 9)    return "#ea580c";
    if (v >= 7)    return "#f97316";
    if (v >= 5)    return "#fb923c";
    if (v >= 3)    return "#dc2626";
    return "#7f1d1d";
}

/* ─── MATH ───────────────────────────────────────────────── */
function pv(slot: number): number { return (PELTON_CURVE[slot] ?? 0) * 100; }

function computeEV(dist: Record<number, number>): number {
    return Object.entries(dist).reduce((s, [k, p]) => s + pv(Number(k)) * p, 0);
}

function uniformDist(min: number, max: number): Record<number, number> {
    const n = max - min + 1;
    const d: Record<number, number> = {};
    for (let i = min; i <= max; i++) d[i] = 1 / n;
    return d;
}

function computeProtected(fullDist: Record<number, number>, pm: number, px: number) {
    const conveyDist: Record<number, number> = {};
    let conveyProb = 0;
    for (const [s, p] of Object.entries(fullDist)) {
        const n = Number(s);
        if (n < pm || n > px) { conveyDist[n] = p; conveyProb += p; }
    }
    if (conveyProb === 0) return { conveyProb: 0, condEV: 0, rawEV: 0, conveyDist: {} as Record<number, number> };
    const norm: Record<number, number> = {};
    for (const [s, p] of Object.entries(conveyDist)) norm[Number(s)] = p / conveyProb;
    const condEV = computeEV(norm);
    return { conveyProb, condEV, rawEV: condEV * conveyProb, conveyDist: norm };
}

/* ─── NBA LOTTERY MATRIX ─────────────────────────────────── */
// Combinations assigned to each standing (1=worst … 14=14th worst), sums to 1000
const LOTTERY_COMBOS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
const LOTTERY_TOTAL = 1000;

// Exact O(14^4) calculation: enumerate all ordered 4-tuples of lottery winners,
// assign picks 5–14 to remaining teams in standing order.
// LOTTERY_MATRIX[standing][slot] — both 0-indexed (0=worst, 0=pick1)
const LOTTERY_MATRIX: number[][] = (() => {
    const N = 14;
    const mat = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i1 = 0; i1 < N; i1++) {
        const p1 = LOTTERY_COMBOS[i1] / LOTTERY_TOTAL;
        mat[i1][0] += p1;
        for (let i2 = 0; i2 < N; i2++) {
            if (i2 === i1) continue;
            const p2 = LOTTERY_COMBOS[i2] / (LOTTERY_TOTAL - LOTTERY_COMBOS[i1]);
            mat[i2][1] += p1 * p2;
            for (let i3 = 0; i3 < N; i3++) {
                if (i3 === i1 || i3 === i2) continue;
                const p3 = LOTTERY_COMBOS[i3] / (LOTTERY_TOTAL - LOTTERY_COMBOS[i1] - LOTTERY_COMBOS[i2]);
                mat[i3][2] += p1 * p2 * p3;
                for (let i4 = 0; i4 < N; i4++) {
                    if (i4 === i1 || i4 === i2 || i4 === i3) continue;
                    const p4 = LOTTERY_COMBOS[i4] / (LOTTERY_TOTAL - LOTTERY_COMBOS[i1] - LOTTERY_COMBOS[i2] - LOTTERY_COMBOS[i3]);
                    const pSeq = p1 * p2 * p3 * p4;
                    mat[i4][3] += pSeq;
                    const winners = new Set([i1, i2, i3, i4]);
                    let slot = 4;
                    for (let t = 0; t < N; t++) {
                        if (!winners.has(t)) { mat[t][slot] += pSeq; slot++; }
                    }
                }
            }
        }
    }
    return mat;
})();

// Convert pre-lottery standings to a slot probability distribution.
// s1/s2: 1-indexed standings, 1=worst record, 30=best record.
// Round 1: standings 1-14 use NBA lottery odds; 15-30 → slot = standing (deterministic).
// Round 2: all standings deterministic, slot = standing + 30.
function getStandingDist(round: 1 | 2, s1: number, s2: number): Record<number, number> {
    const lo = Math.min(s1, s2), hi = Math.max(s1, s2);
    const n = hi - lo + 1;
    const dist: Record<number, number> = {};
    for (let s = lo; s <= hi; s++) {
        if (round === 2) {
            const slot = s + 30;
            dist[slot] = (dist[slot] ?? 0) + 1 / n;
        } else if (s <= 14) {
            const row = LOTTERY_MATRIX[s - 1];
            for (let slot = 1; slot <= 14; slot++) {
                dist[slot] = (dist[slot] ?? 0) + row[slot - 1] / n;
            }
        } else {
            dist[s] = (dist[s] ?? 0) + 1 / n;
        }
    }
    return dist;
}

/* ─── MULTI-TEAM SWAP ────────────────────────────────────── */
const SWAP_COLORS = ["#E6B85C", "#a855f7", "#22d3ee", "#f97316", "#4ade80"];

function getPositionOptions(n: number): Array<{ label: string; k: number }> {
    if (n === 2) return [{ label: "Best", k: 1 }, { label: "Worst", k: 2 }];
    if (n === 3) return [{ label: "Best", k: 1 }, { label: "Mid", k: 2 }, { label: "Worst", k: 3 }];
    if (n === 4) return [
        { label: "Best", k: 1 }, { label: "Upper Mid", k: 2 },
        { label: "Lower Mid", k: 3 }, { label: "Worst", k: 4 },
    ];
    return [
        { label: "Best", k: 1 }, { label: "Upper Mid", k: 2 }, { label: "Mid", k: 3 },
        { label: "Lower Mid", k: 4 }, { label: "Worst", k: 5 },
    ];
}

// k-th order statistic EV via CDF-based DP — O(60 × n²), exact
function computeOrderStatEV(
    dists: Record<number, number>[],
    k: number
): { rawEV: number } {
    const n = dists.length;
    const cdfs: number[][] = dists.map(dist => {
        const cdf = new Array(62).fill(0);
        for (let x = 1; x <= 60; x++) cdf[x] = cdf[x - 1] + (dist[x] ?? 0);
        return cdf;
    });
    let prevCdfK = 0, rawEV = 0;
    for (let x = 1; x <= 60; x++) {
        let dp = new Array(n + 1).fill(0);
        dp[0] = 1;
        for (let i = 0; i < n; i++) {
            const pi = cdfs[i][x];
            const nd = new Array(n + 1).fill(0);
            for (let j = 0; j <= i; j++) {
                nd[j]     += dp[j] * (1 - pi);
                nd[j + 1] += dp[j] * pi;
            }
            dp = nd;
        }
        let cdfK = 0;
        for (let j = k; j <= n; j++) cdfK += dp[j];
        const prob = cdfK - prevCdfK;
        if (prob > 1e-10) rawEV += pv(x) * prob;
        prevCdfK = cdfK;
    }
    return { rawEV };
}

// 2-team win probabilities (only meaningful for 2-team best swap)
function twoTeamWinProbs(distA: Record<number, number>, distB: Record<number, number>) {
    let pAWins = 0, pBWins = 0;
    for (const [sa, pa] of Object.entries(distA))
        for (const [sb, pb] of Object.entries(distB)) {
            const prob = pa * pb;
            if (Number(sa) < Number(sb)) pAWins += prob;
            else if (Number(sb) < Number(sa)) pBWins += prob;
        }
    return { pAWins, pBWins };
}

function yearDiscount(year: number, rate: number): number {
    return Math.pow(1 - rate, Math.max(0, year - CURRENT_YEAR));
}

function parseN(s: string, lo: number, hi: number): number | "" {
    if (s === "") return "";
    const n = parseInt(s, 10);
    if (isNaN(n)) return "";
    return Math.min(hi, Math.max(lo, n));
}

/* ─── TYPES ──────────────────────────────────────────────── */
type PickType = "exact" | "range" | "protected" | "swap";
// slot/rMin/rMax are PRE-LOTTERY STANDINGS (1=worst, 30=best), not slot numbers.
// pMin/pMax for protected are in SLOT space (protection defined by where pick lands).
type PickConfig = {
    round: 1 | 2; year: number; pickType: PickType;
    slot: number | "";       // exact standing (1–30)
    rMin: number | "";       // standing range min (1–30)
    rMax: number | "";       // standing range max (1–30)
    pMin: number | "";       // protection slot min (slot space)
    pMax: number | "";       // protection slot max (slot space)
    swapNumTeams: 2 | 3 | 4 | 5;
    swapPosition: number;
    swapRanges: Array<{ min: number | ""; max: number | "" }>; // standings (1–30)
};

type PickResult =
    | { type: "exact";     ev: number; rawEV: number; df: number; standing: number; dist: Record<number,number> }
    | { type: "range";     ev: number; rawEV: number; df: number; dist: Record<number,number>; standingMin: number; standingMax: number }
    | { type: "protected"; ev: number; rawEV: number; df: number; condEV: number; conveyProb: number; fullDist: Record<number,number>; pm: number; px: number; standingMin: number; standingMax: number }
    | { type: "swap";      ev: number; rawEV: number; df: number;
        numTeams: number; position: number; positionLabel: string;
        dists: Record<number,number>[];
        ranges: Array<{ min: number; max: number }>;
        pickLabels: string[];  // human-readable per-pick description
        evPerPick: number[];   // discounted
        marginals: number[];   // ev - evPerPick[i], one per pick
        pAWins: number; pBWins: number; // 2-team best only, else 0
    };

function defaultConfig(round: 1 | 2 = 1): PickConfig {
    const slotLo = round === 1 ? 1 : 31;
    const slotHi = round === 1 ? 30 : 60;
    return {
        round, year: CURRENT_YEAR, pickType: "range",
        slot: 5,          // exact standing: 5th worst
        rMin: 1, rMax: 30, // full league standings range
        pMin: slotLo, pMax: round === 1 ? 5 : 35, // protection: top-5 pick slots
        swapNumTeams: 2,
        swapPosition: 1,
        swapRanges: [
            { min: 1, max: 30 },
            { min: 1, max: 30 },
        ],
    };
}

function computeResult(cfg: PickConfig, rate: number): PickResult | null {
    const slotLo = cfg.round === 1 ? 1 : 31;
    const slotHi = cfg.round === 1 ? 30 : 60;
    const df = yearDiscount(cfg.year, rate);

    if (cfg.pickType === "exact") {
        if (typeof cfg.slot !== "number") return null;
        const standing = Math.min(30, Math.max(1, cfg.slot));
        const dist = getStandingDist(cfg.round, standing, standing);
        const rawEV = computeEV(dist);
        return { type: "exact", ev: rawEV * df, rawEV, df, standing, dist };
    }
    if (cfg.pickType === "range") {
        const standingMin = typeof cfg.rMin === "number" ? cfg.rMin : 1;
        const standingMax = typeof cfg.rMax === "number" ? cfg.rMax : 30;
        if (standingMin > standingMax) return null;
        const dist = getStandingDist(cfg.round, standingMin, standingMax);
        const rawEV = computeEV(dist);
        return { type: "range", ev: rawEV * df, rawEV, df, dist, standingMin, standingMax };
    }
    if (cfg.pickType === "protected") {
        const standingMin = typeof cfg.rMin === "number" ? cfg.rMin : 1;
        const standingMax = typeof cfg.rMax === "number" ? cfg.rMax : 30;
        const pm = typeof cfg.pMin === "number" ? cfg.pMin : slotLo;
        const px = typeof cfg.pMax === "number" ? cfg.pMax : slotLo + 4;
        if (standingMin > standingMax) return null;
        const fullDist = getStandingDist(cfg.round, standingMin, standingMax);
        const { conveyProb, condEV, rawEV } = computeProtected(fullDist, pm, px);
        return { type: "protected", ev: rawEV * df, rawEV, df, condEV, conveyProb, fullDist, pm, px, standingMin, standingMax };
    }
    if (cfg.pickType === "swap") {
        const { swapNumTeams, swapPosition, swapRanges } = cfg;
        const dists: Record<number, number>[] = [];
        const ranges: Array<{ min: number; max: number }> = [];
        for (let i = 0; i < swapNumTeams; i++) {
            const r = swapRanges[i] ?? { min: 1, max: 30 };
            const sm = typeof r.min === "number" ? r.min : 1;
            const sx = typeof r.max === "number" ? r.max : 30;
            const s1 = Math.min(sm, sx), s2 = Math.max(sm, sx);
            dists.push(getStandingDist(cfg.round, s1, s2));
            ranges.push({ min: s1, max: s2 });
        }
        const pickLabels = ranges.map(({ min: s1, max: s2 }) =>
            s1 === s2 ? `Standing #${s1}` : `Standings #${s1}–#${s2}`
        );
        const { rawEV } = computeOrderStatEV(dists, swapPosition);
        const evPerPick = dists.map(d => computeEV(d) * df);
        const positionLabel = getPositionOptions(swapNumTeams).find(o => o.k === swapPosition)?.label ?? `#${swapPosition}`;
        const { pAWins, pBWins } = swapNumTeams === 2 && swapPosition === 1
            ? twoTeamWinProbs(dists[0], dists[1])
            : { pAWins: 0, pBWins: 0 };
        const ev = rawEV * df;
        return {
            type: "swap", ev, rawEV, df,
            numTeams: swapNumTeams, position: swapPosition, positionLabel,
            dists, ranges, pickLabels,
            evPerPick,
            marginals: evPerPick.map(e => ev - e),
            pAWins, pBWins,
        };
    }
    return null;
}

/* ─── FORMULA DISPLAY ────────────────────────────────────── */
function FormulaDisplay({ result, cfg, rate }: { result: PickResult; cfg: PickConfig; rate: number }) {
    const dt = Math.max(0, cfg.year - CURRENT_YEAR);
    const dfLine = dt === 0
        ? `D(${cfg.year}) = 1.0000  (current year — no discount)`
        : `D(${cfg.year}) = (1 − ${(rate * 100).toFixed(1)}%)^${dt} = ${result.df.toFixed(4)}`;

    const lines: string[] = [];

    if (result.type === "exact") {
        lines.push(`EV  =  V(${result.slot})  ×  D(${cfg.year})`);
        lines.push(``);
        lines.push(`V(${result.slot})    =  ${result.rawEV.toFixed(2)}   ← Pelton value at slot ${result.slot}`);
        lines.push(`${dfLine}`);
        lines.push(``);
        lines.push(`EV  =  ${result.rawEV.toFixed(2)}  ×  ${result.df.toFixed(4)}  =  ${result.ev.toFixed(2)}`);
    }

    if (result.type === "range") {
        const { min, max, dist } = result;
        const n = max - min + 1;
        const p = (1 / n).toFixed(4);
        lines.push(`EV  =  [ Σᵢ₌${min}..${max}  P(i) · V(i) ]  ×  D(${cfg.year})`);
        lines.push(``);
        lines.push(`Assumes uniform distribution: each slot equally likely`);
        lines.push(`P(i)  =  1 / n  =  1 / ${n}  =  ${p}   for all i in [${min}, ${max}]`);
        lines.push(`V(i)  =  Pelton curve value at slot i`);
        lines.push(``);
        const slots = Object.keys(dist).map(Number).sort((a, b) => a - b);
        const display = slots.length <= 8 ? slots : [...slots.slice(0, 4), -1, ...slots.slice(-3)];
        lines.push(`Slot breakdown  (contribution = P × V):`);
        for (const s of display) {
            if (s === -1) { lines.push(`    ...`); continue; }
            const v = pv(s);
            lines.push(`    i=${String(s).padStart(2)}:  V=${v.toFixed(2).padStart(6)}  ×  ${p}  =  ${(v / n).toFixed(3).padStart(6)}`);
        }
        lines.push(``);
        lines.push(`Σ P(i) · V(i)  =  ${result.rawEV.toFixed(3)}   (undiscounted)`);
        lines.push(`${dfLine}`);
        lines.push(``);
        lines.push(`EV  =  ${result.rawEV.toFixed(3)}  ×  ${result.df.toFixed(4)}  =  ${result.ev.toFixed(2)}`);
    }

    if (result.type === "protected") {
        const { min, max, pm, px, conveyProb, condEV, fullDist } = result;
        const fullN = max - min + 1;
        const protN = px - pm + 1;
        const conveyN = fullN - protN;
        lines.push(`EV  =  P(conveys)  ×  E[V | conveys]  ×  D(${cfg.year})`);
        lines.push(``);
        lines.push(`Full slot range:  ${min}–${max}   (n = ${fullN}, uniform)`);
        lines.push(`Protected zone:   ${pm}–${px}   (${protN} slot${protN > 1 ? "s" : ""} — pick stays if it lands here)`);
        lines.push(``);
        lines.push(`P(conveys)  =  slots outside protection / total slots`);
        lines.push(`            =  (${fullN} − ${protN}) / ${fullN}`);
        lines.push(`            =  ${conveyN} / ${fullN}`);
        lines.push(`            =  ${conveyProb.toFixed(4)}`);
        lines.push(``);
        const conveySlots = Object.keys(fullDist).map(Number).filter(s => s < pm || s > px).sort((a, b) => a - b);
        lines.push(`E[V | conveys]  =  average Pelton value over the ${conveyN} conveying slots`);
        lines.push(`                =  (1/${conveyN}) × Σ V(i)   for i ∉ [${pm}, ${px}]`);
        lines.push(``);
        const showAll = conveySlots.length <= 6;
        const disp = showAll ? conveySlots : [...conveySlots.slice(0, 3), -1, ...conveySlots.slice(-3)];
        for (const s of disp) {
            if (s === -1) { lines.push(`    ...`); continue; }
            lines.push(`    V(${String(s).padStart(2)})  =  ${pv(s).toFixed(2)}`);
        }
        lines.push(``);
        lines.push(`E[V | conveys]  =  ${condEV.toFixed(3)}`);
        lines.push(``);
        lines.push(`Undiscounted EV  =  ${conveyProb.toFixed(4)}  ×  ${condEV.toFixed(3)}  =  ${result.rawEV.toFixed(3)}`);
        lines.push(`${dfLine}`);
        lines.push(``);
        lines.push(`EV  =  ${result.rawEV.toFixed(3)}  ×  ${result.df.toFixed(4)}  =  ${result.ev.toFixed(2)}`);
    }

    if (result.type === "swap") {
        const { numTeams, position, positionLabel, ranges, pickLabels, evPerPick, marginals, pAWins, pBWins } = result;

        lines.push(`${numTeams}-Team Swap · receive the ${positionLabel} pick (rank ${position} of ${numTeams})`);
        lines.push(``);
        lines.push(`EV  =  E[ V( order_stat_{k=${position}}(s₁, …, s_${numTeams}) ) ]  ×  D(${cfg.year})`);
        lines.push(``);
        lines.push(`"k-th order statistic" = the k-th smallest slot among n independent draws.`);
        lines.push(`Lower slot = earlier in draft = higher Pelton value.`);
        lines.push(`k=${position} → ${positionLabel.toLowerCase()} pick of the ${numTeams}.`);
        lines.push(``);
        for (let i = 0; i < numTeams; i++) {
            const label = result.pickLabels[i];
            const isLottery = label.startsWith("Lottery");
            if (isLottery) {
                lines.push(`Pick ${i+1}:  ${label}  →  NBA lottery odds  →  slot distribution over 1–14`);
            } else {
                const { min, max } = ranges[i];
                const n = max - min + 1;
                lines.push(`Pick ${i+1}:  ${label}  (P(sᵢ=x) = 1/${n} = ${(1/n).toFixed(4)})`);
            }
        }
        lines.push(``);
        lines.push(`── CDF-based DP (O(60 × n²)) ────────────────────────────`);
        lines.push(``);
        lines.push(`For each threshold x from 1 to 60:`);
        lines.push(`  1.  pᵢ(x)  =  P(pickᵢ ≤ x)  for each i`);
        lines.push(`  2.  DP over picks → P(exactly j picks ≤ x)  for j = 0..${numTeams}`);
        lines.push(`  3.  P(k-th order stat ≤ x)  =  Σ_{j≥${position}}  P(exactly j picks ≤ x)`);
        lines.push(`  4.  P(k-th order stat = x)  =  P(≤ x)  −  P(≤ x−1)`);
        lines.push(``);
        lines.push(`Undiscounted EV  =  Σₓ  V(x) · P(k-th order stat = x)  =  ${result.rawEV.toFixed(3)}`);
        lines.push(`${dfLine}`);
        lines.push(`EV  =  ${result.rawEV.toFixed(3)}  ×  ${result.df.toFixed(4)}  =  ${result.ev.toFixed(2)}`);
        lines.push(``);
        if (numTeams === 2 && position === 1) {
            const pTie = 1 - pAWins - pBWins;
            lines.push(`── 2-team win probabilities ──────────────────────────────`);
            lines.push(``);
            lines.push(`P(Pick 1 wins)  =  P(s₁ < s₂)  =  ${(pAWins*100).toFixed(1)}%`);
            lines.push(`P(Pick 2 wins)  =  P(s₂ < s₁)  =  ${(pBWins*100).toFixed(1)}%`);
            lines.push(`P(Tie)          =  P(s₁ = s₂)  =  ${(pTie*100).toFixed(1)}%`);
            lines.push(``);
        }
        lines.push(`── Marginal value of the swap right ─────────────────────`);
        lines.push(``);
        lines.push(`Swap EV (${positionLabel})  =  ${result.ev.toFixed(2)}`);
        lines.push(``);
        for (let i = 0; i < numTeams; i++) {
            const m = marginals[i];
            lines.push(`EV(Pick ${i+1} alone)  =  ${evPerPick[i].toFixed(2)}   →   marginal  =  ${result.ev.toFixed(2)} − ${evPerPick[i].toFixed(2)}  =  ${m >= 0 ? "+" : ""}${m.toFixed(2)}`);
        }
        lines.push(``);
        lines.push(`A positive marginal = the swap right adds value vs owning that pick outright.`);
        lines.push(`A negative marginal = you'd be better off just holding that pick alone.`);
        lines.push(`  (expected for "Worst" positions — you're receiving the worst pick.)`);
    }

    return (
        <div className="rounded-xl p-4 border border-white/6" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(168,169,173,0.45)" }}>
                Formula · Step-by-Step
            </div>
            <pre className="text-[11px] leading-[1.7] whitespace-pre-wrap font-mono overflow-x-auto"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                {lines.join("\n")}
            </pre>
        </div>
    );
}

/* ─── PICK CONFIGURATOR PANEL ────────────────────────────── */
function PickConfigPanel({
    config,
    onChange,
    accent = "#E6B85C",
}: {
    config: PickConfig;
    onChange: (u: Partial<PickConfig>) => void;
    accent?: string;
}) {
    // Standings are always 1–30 (1 = worst record). getStandingDist maps them to
    // draft slots per round (round 2 → slots 31–60). Only protection lives in slot space.
    const sLo = 1, sHi = 30;
    const pLo = config.round === 1 ? 1 : 31;
    const pHi = config.round === 1 ? 30 : 60;
    function ps(s: string) { return parseN(s, sLo, sHi); }
    function pp(s: string) { return parseN(s, pLo, pHi); }

    const activeBtn = { background: accent, color: "#000" } as React.CSSProperties;
    const inactiveClass = "glass-row text-white/50 hover:text-white/80";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
                {/* Year */}
                <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Year</label>
                    <select value={config.year} onChange={e => onChange({ year: Number(e.target.value) })} className="glass-select">
                        {[2026,2027,2028,2029,2030,2031,2032,2033].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Round */}
                <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Round</label>
                    <div className="flex gap-1">
                        {([1, 2] as const).map(r => (
                            <button key={r}
                                onClick={() => {
                                    // Standings (slot/rMin/rMax/swapRanges) are 1–30 in both rounds —
                                    // only the protection window lives in slot space, so just remap that.
                                    onChange({
                                        round: r,
                                        pMin: r === 1 ? 1 : 31,
                                        pMax: r === 1 ? 5 : 35,
                                    });
                                }}
                                style={config.round === r ? activeBtn : {}}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${config.round === r ? "" : inactiveClass}`}>
                                {r === 1 ? "1st" : "2nd"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Type</label>
                    <div className="flex gap-1 flex-wrap">
                        {(["exact", "range", "protected", "swap"] as const).map(t => (
                            <button key={t} onClick={() => onChange({ pickType: t })}
                                style={config.pickType === t ? activeBtn : {}}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${config.pickType === t ? "" : inactiveClass}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Slot inputs */}
            <div className="flex flex-wrap gap-4 items-end">
                {config.pickType === "exact" && (
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Standing ({sLo}–{sHi})</label>
                        <input type="number" min={sLo} max={sHi} value={config.slot}
                            onChange={e => onChange({ slot: ps(e.target.value) })}
                            className="glass-select w-24 text-center text-xl font-black" style={{ color: accent }} />
                    </div>
                )}

                {(config.pickType === "range" || config.pickType === "protected") && (<>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>From</label>
                        <input type="number" min={sLo} max={sHi} value={config.rMin}
                            onChange={e => onChange({ rMin: ps(e.target.value) })}
                            className="glass-select w-20 text-center text-xl font-black" style={{ color: accent }} />
                    </div>
                    <div className="pb-2 text-white/20 font-black">–</div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>To</label>
                        <input type="number" min={sLo} max={sHi} value={config.rMax}
                            onChange={e => onChange({ rMax: ps(e.target.value) })}
                            className="glass-select w-20 text-center text-xl font-black" style={{ color: accent }} />
                    </div>
                </>)}

                {config.pickType === "protected" && (<>
                    <div className="flex items-end pb-2 px-1 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(59,130,246,0.6)" }}>protected slots</div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(59,130,246,0.55)" }}>From ({pLo})</label>
                        <input type="number" min={pLo} max={pHi} value={config.pMin}
                            onChange={e => onChange({ pMin: pp(e.target.value) })}
                            className="glass-select w-20 text-center text-xl font-black" style={{ color: "#3b82f6" }} />
                    </div>
                    <div className="pb-2 font-black" style={{ color: "rgba(59,130,246,0.3)" }}>–</div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(59,130,246,0.55)" }}>To ({pHi})</label>
                        <input type="number" min={pLo} max={pHi} value={config.pMax}
                            onChange={e => onChange({ pMax: pp(e.target.value) })}
                            className="glass-select w-20 text-center text-xl font-black" style={{ color: "#3b82f6" }} />
                    </div>
                </>)}
            </div>

            {/* Swap: multi-team controls */}
            {config.pickType === "swap" && (
                <div className="space-y-4 pt-1">
                    {/* Teams + Position */}
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Teams</label>
                            <div className="flex gap-1">
                                {([2, 3, 4, 5] as const).map(n => (
                                    <button key={n}
                                        onClick={() => {
                                            const newRanges = Array.from({ length: n }, (_, i) =>
                                                config.swapRanges[i] ?? { min: sLo, max: sHi, lotteryMode: false, standingMin: 1, standingMax: 14 }
                                            );
                                            onChange({
                                                swapNumTeams: n,
                                                swapPosition: Math.min(config.swapPosition, n),
                                                swapRanges: newRanges,
                                            });
                                        }}
                                        style={config.swapNumTeams === n ? activeBtn : {}}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${config.swapNumTeams === n ? "" : inactiveClass}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>You receive</label>
                            <div className="flex gap-1 flex-wrap">
                                {getPositionOptions(config.swapNumTeams).map(({ label, k }) => (
                                    <button key={k}
                                        onClick={() => onChange({ swapPosition: k })}
                                        style={config.swapPosition === k ? activeBtn : {}}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${config.swapPosition === k ? "" : inactiveClass}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Per-team range inputs */}
                    <div className="flex flex-wrap gap-x-6 gap-y-4">
                        {Array.from({ length: config.swapNumTeams }, (_, i) => {
                            const r = config.swapRanges[i] ?? { min: sLo, max: sHi, lotteryMode: false, standingMin: 1, standingMax: 14 };
                            const col = SWAP_COLORS[i];
                            const isLottery = r.lotteryMode;
                            function updateRange(patch: Partial<typeof r>) {
                                const nr = [...config.swapRanges];
                                nr[i] = { ...r, ...patch };
                                onChange({ swapRanges: nr });
                            }
                            return (
                                <div key={i} className="space-y-2">
                                    {/* Pick label + mode toggle */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest w-12 shrink-0" style={{ color: col }}>
                                            Pick {i + 1}
                                        </span>
                                        <div className="flex rounded-lg overflow-hidden border border-white/10">
                                            {(["Range", "Lottery"] as const).map(mode => {
                                                const active = mode === "Lottery" ? isLottery : !isLottery;
                                                return (
                                                    <button key={mode}
                                                        onClick={() => updateRange({ lotteryMode: mode === "Lottery" })}
                                                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all ${active ? "" : "text-white/35 hover:text-white/60"}`}
                                                        style={active ? { background: col, color: "#000" } : {}}>
                                                        {mode}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Inputs */}
                                    <div className="flex items-end gap-2">
                                        {isLottery ? (<>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest" style={{ color: `${col}88` }}>Standing from</label>
                                                <input type="number" min={1} max={14} value={r.standingMin}
                                                    onChange={e => updateRange({ standingMin: parseN(e.target.value, 1, 14) })}
                                                    className="glass-select text-center text-lg font-black" style={{ color: col, width: "4.5rem" }} />
                                            </div>
                                            <div className="pb-2 font-black" style={{ color: `${col}40` }}>–</div>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest" style={{ color: `${col}88` }}>Standing to</label>
                                                <input type="number" min={1} max={14} value={r.standingMax}
                                                    onChange={e => updateRange({ standingMax: parseN(e.target.value, 1, 14) })}
                                                    className="glass-select text-center text-lg font-black" style={{ color: col, width: "4.5rem" }} />
                                            </div>
                                            <div className="pb-1 text-[9px] font-semibold" style={{ color: `${col}70` }}>
                                                1=worst · 14=14th worst
                                            </div>
                                        </>) : (<>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest" style={{ color: `${col}88` }}>From</label>
                                                <input type="number" min={sLo} max={sHi} value={r.min}
                                                    onChange={e => updateRange({ min: ps(e.target.value) })}
                                                    className="glass-select text-center text-lg font-black" style={{ color: col, width: "4.5rem" }} />
                                            </div>
                                            <div className="pb-2 font-black" style={{ color: `${col}40` }}>–</div>
                                            <div className="space-y-1">
                                                <label className="block text-[10px] uppercase tracking-widest" style={{ color: `${col}88` }}>To</label>
                                                <input type="number" min={sLo} max={sHi} value={r.max}
                                                    onChange={e => updateRange({ max: ps(e.target.value) })}
                                                    className="glass-select text-center text-lg font-black" style={{ color: col, width: "4.5rem" }} />
                                            </div>
                                        </>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── EV CARD ────────────────────────────────────────────── */
function EvCard({ result, cfg, rate }: {
    result: PickResult; cfg: PickConfig; rate: number;
}) {
    const dt = Math.max(0, cfg.year - CURRENT_YEAR);
    return (
        <div className="glass-surface rounded-xl p-5 border border-white/8 space-y-3">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>Expected Value</div>
            <div className="text-5xl font-black tabular-nums leading-none" style={{ color: valueColor(result.ev) }}>
                {result.ev.toFixed(1)}
            </div>

            {dt > 0 && (
                <div className="text-xs space-y-0.5" style={{ color: "rgba(168,169,173,0.6)" }}>
                    <div>Undiscounted: <span className="text-white font-semibold">{result.rawEV.toFixed(1)}</span></div>
                    <div>D({cfg.year}): <span className="text-white font-semibold">{result.df.toFixed(3)}</span> ({dt}yr × {(rate*100).toFixed(1)}%)</div>
                </div>
            )}

            {result.type === "protected" && (
                <div className="text-xs space-y-0.5" style={{ color: "rgba(168,169,173,0.6)" }}>
                    <div>Conveys: <span className="text-white font-bold">{(result.conveyProb*100).toFixed(0)}%</span></div>
                    <div>Cond. EV: <span className="font-bold" style={{ color: valueColor(result.condEV) }}>{result.condEV.toFixed(1)}</span></div>
                </div>
            )}

            {result.type === "swap" && (
                <div className="text-xs space-y-1.5" style={{ color: "rgba(168,169,173,0.6)" }}>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.4)" }}>
                        {result.numTeams}-Team · {result.positionLabel}
                    </div>
                    {result.numTeams === 2 && result.pAWins > 0 && (
                        <div className="flex gap-3 text-[11px]">
                            <span><span style={{ color: SWAP_COLORS[0] }}>P1 wins</span> {(result.pAWins*100).toFixed(0)}%</span>
                            <span><span style={{ color: SWAP_COLORS[1] }}>P2 wins</span> {(result.pBWins*100).toFixed(0)}%</span>
                        </div>
                    )}
                    <div className="pt-1 border-t border-white/6 space-y-0.5">
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(168,169,173,0.4)" }}>Marginal vs owning each pick alone</div>
                        {result.evPerPick.map((e, i) => {
                            const m = result.marginals[i];
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <span style={{ color: SWAP_COLORS[i] }} className="font-bold w-12 shrink-0">Pick {i+1}</span>
                                    <span style={{ color: "rgba(168,169,173,0.55)" }}>{e.toFixed(1)}</span>
                                    <span className="font-bold" style={{ color: m >= 0 ? valueColor(Math.abs(m)) : "#ef4444" }}>
                                        {m >= 0 ? "+" : ""}{m.toFixed(1)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}

/* ─── DISTRIBUTION CHART DATA ────────────────────────────── */
function buildDistData(result: PickResult) {
    if (result.type === "swap") return null;
    if (result.type === "exact") return [{ slot: result.slot, value: result.rawEV, prot: false, opacity: 0.85 }];
    if (result.type === "range") {
        return Object.keys(result.dist).map(Number).sort((a,b)=>a-b).map(s => ({
            slot: s, value: pv(s), prot: false, opacity: 0.85,
        }));
    }
    if (result.type === "protected") {
        const { pm, px } = result;
        return Object.keys(result.fullDist).map(Number).sort((a,b)=>a-b).map(s => ({
            slot: s, value: pv(s), prot: s >= pm && s <= px, opacity: 0.85,
        }));
    }
    return null;
}

function buildSwapData(result: PickResult) {
    if (result.type !== "swap") return null;
    const { ranges, dists } = result;
    const lo = Math.min(...ranges.map(r => r.min));
    const hi = Math.max(...ranges.map(r => r.max));
    return Array.from({ length: hi - lo + 1 }, (_, i) => {
        const s = lo + i;
        const v = pv(s);
        const entry: Record<string, number | null> = { slot: s };
        dists.forEach((d, idx) => { entry[`pick${idx + 1}`] = d[s] != null ? v : null; });
        return entry;
    });
}

/* ─── TRADE SIDE (list of picks) ─────────────────────────── */
function TradeSide({
    title, accent, cfgs, results, onChangeCfg, onAdd, onRemove,
}: {
    title: string;
    accent: string;
    cfgs: PickConfig[];
    results: (PickResult | null)[];
    onChangeCfg: (i: number, u: Partial<PickConfig>) => void;
    onAdd: () => void;
    onRemove: (i: number) => void;
}) {
    const total = results.reduce((s, r) => s + (r?.ev ?? 0), 0);
    return (
        <div className="glass-surface rounded-xl p-5 space-y-4" style={{ border: `1px solid ${accent}26` }}>
            {/* Header + running total */}
            <div className="flex items-baseline justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>{title}</div>
                <div className="text-right leading-none">
                    <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(168,169,173,0.45)" }}>Total EV</div>
                    <div className="text-3xl font-black tabular-nums" style={{ color: valueColor(total) }}>{total.toFixed(1)}</div>
                </div>
            </div>

            {/* Per-pick cards */}
            <div className="space-y-3">
                {cfgs.map((cfg, i) => {
                    const r = results[i];
                    return (
                        <div key={i} className="rounded-lg p-4 space-y-3"
                            style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${accent}cc` }}>
                                    Pick {i + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                    {r && (
                                        <span className="text-lg font-black tabular-nums" style={{ color: valueColor(r.ev) }}>
                                            {r.ev.toFixed(1)}
                                            {cfg.year > CURRENT_YEAR && (
                                                <span className="ml-1.5 text-[10px] font-semibold" style={{ color: "rgba(168,169,173,0.5)" }}>
                                                    raw {r.rawEV.toFixed(1)}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    {cfgs.length > 1 && (
                                        <button onClick={() => onRemove(i)} title="Remove pick"
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-base font-black text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                            <PickConfigPanel config={cfg} onChange={u => onChangeCfg(i, u)} accent={accent} />
                        </div>
                    );
                })}
            </div>

            {/* Add pick */}
            <button onClick={onAdd}
                className="w-full py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-white/45 hover:text-white/85 transition-all"
                style={{ border: `1px dashed ${accent}40` }}>
                + Add pick
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function PeltonScaleClient({ picks: _picks }: { picks: unknown[] }) {
    /* Compare picks */
    const [cmpA, setCmpA] = useState<number | "">("");
    const [cmpB, setCmpB] = useState<number | "">("");

    /* Lab settings */
    const discountRate = 0.02; // fixed default — discount applied to future-year picks
    const [labView, setLabView] = useState<"analyze" | "trade">("analyze");

    /* Analyze mode */
    const [aCfg, setACfg] = useState<PickConfig>(defaultConfig(1));

    /* Trade mode — each side holds a list of picks */
    const [tCfgsA, setTCfgsA] = useState<PickConfig[]>([defaultConfig(1)]);
    const [tCfgsB, setTCfgsB] = useState<PickConfig[]>([defaultConfig(1)]);

    const aResult = useMemo(() => computeResult(aCfg, discountRate), [aCfg, discountRate]);
    const tResultsA = useMemo(() => tCfgsA.map(c => computeResult(c, discountRate)), [tCfgsA, discountRate]);
    const tResultsB = useMemo(() => tCfgsB.map(c => computeResult(c, discountRate)), [tCfgsB, discountRate]);

    const totalA = tResultsA.reduce((s, r) => s + (r?.ev ?? 0), 0);
    const totalB = tResultsB.reduce((s, r) => s + (r?.ev ?? 0), 0);
    const tradeDiff = totalA - totalB;

    /* Trade list mutators */
    const updateCfg = (setFn: typeof setTCfgsA, i: number, u: Partial<PickConfig>) =>
        setFn(list => list.map((c, idx) => (idx === i ? { ...c, ...u } : c)));
    const addCfg = (setFn: typeof setTCfgsA) =>
        setFn(list => [...list, defaultConfig(1)]);
    const removeCfg = (setFn: typeof setTCfgsA, i: number) =>
        setFn(list => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list));

    /* Compare picks */
    const cvA = typeof cmpA === "number" ? PELTON_CURVE[cmpA] ?? null : null;
    const cvB = typeof cmpB === "number" ? PELTON_CURVE[cmpB] ?? null : null;
    const cmpRatio = cvA && cvB && cvB > 0 ? cvA / cvB : null;
    const aHigher = cmpRatio !== null ? cmpRatio >= 1 : null;
    const dispRatio = cmpRatio !== null ? (cmpRatio >= 1 ? cmpRatio : 1/cmpRatio) : null;

    return (
        <div className="glass-bg min-h-screen text-white">
            <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

                {/* HEADER */}
                <header className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-gold">Draft Value Curve</h1>
                </header>

                {/* CHART + TABLE */}
                <section className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-5">
                    <div className="glass-card rounded-2xl p-8">
                        <h2 className="text-[11px] font-black tracking-[0.15em] uppercase text-gold mb-6" style={{ opacity: 0.6 }}>Value by Pick</h2>
                        <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={peltonData}>
                                    <XAxis dataKey="pick" ticks={X_TICKS} tick={{ fontSize: 10, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={{ stroke: "#333" }} />
                                    <YAxis tick={{ fontSize: 10, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={{ stroke: "#333" }} />
                                    <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #E6B85C", borderRadius: 12, fontSize: 12 }}
                                        labelStyle={{ color: "#E6B85C", fontWeight: 600 }}
                                        formatter={v => [`${Number(v).toFixed(2)}`, "Value"]}
                                        labelFormatter={l => `Pick ${l}`} />
                                    <ReferenceArea x1={1}  x2={14} fill="#E6B85C" fillOpacity={0.06} />
                                    <ReferenceArea x1={14} x2={30} fill="#A8A9AD" fillOpacity={0.03} />
                                    <ReferenceLine x={14} stroke="#E6B85C" strokeDasharray="3 3" strokeOpacity={0.5}
                                        label={{ value: "End of Lottery", position: "insideTop", fill: "#E6B85C", fontSize: 11 }} />
                                    <ReferenceLine x={30} stroke="#A8A9AD" strokeDasharray="3 3" strokeOpacity={0.45}
                                        label={{ value: "End of 1st", position: "insideTop", fill: "#A8A9AD", fontSize: 11 }} />
                                    <defs>
                                        {/* Gradient follows the value color scale along the curve:
                                            gold → green → white (~end of 1st) → orange → red */}
                                        <linearGradient id="lg" x1="0" x2="1" y1="0" y2="0">
                                            {peltonData.map((d, i) => (
                                                <stop
                                                    key={d.pick}
                                                    offset={`${(i / (peltonData.length - 1)) * 100}%`}
                                                    stopColor={valueColor(d.value)}
                                                />
                                            ))}
                                        </linearGradient>
                                    </defs>
                                    <Line type="monotone" dataKey="value" stroke="url(#lg)" strokeWidth={2.5} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-[11px] font-black tracking-[0.15em] uppercase text-gold mb-4" style={{ opacity: 0.6 }}>Pick Values</h2>
                        <div className="h-96 overflow-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 z-10" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 font-semibold uppercase tracking-wide text-[#A8A9AD]">Pick</th>
                                        <th className="text-right py-2 px-3 font-semibold uppercase tracking-wide text-[#A8A9AD]">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {peltonData.map(row => (
                                        <tr key={row.pick} className={`border-b border-white/5 last:border-0 ${row.pick > 30 ? "opacity-55" : ""}`}>
                                            <td className="py-1.5 px-3 font-mono" style={{ color: "#A8A9AD" }}>{row.pick}</td>
                                            <td className="py-1 px-3 text-right font-mono font-semibold" style={{ color: valueColor(row.value) }}>
                                                {row.value.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* COMPARE PICKS
                <section className="glass-card rounded-2xl p-6 space-y-5">
                    <h2 className="text-[11px] font-black tracking-[0.15em] uppercase text-gold" style={{ opacity: 0.6 }}>Compare Picks</h2>
                    <div className="flex items-end gap-5 flex-wrap">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.55)" }}>Pick A</label>
                            <input type="number" min={1} max={60} placeholder="1–60" value={cmpA}
                                onChange={e => setCmpA(parseN(e.target.value, 1, 60))}
                                className="glass-select w-24 text-center text-xl font-black text-gold" />
                        </div>
                        <div className="pb-2 text-xl font-black" style={{ color: "rgba(168,169,173,0.25)" }}>vs</div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.55)" }}>Pick B</label>
                            <input type="number" min={1} max={60} placeholder="1–60" value={cmpB}
                                onChange={e => setCmpB(parseN(e.target.value, 1, 60))}
                                className="glass-select w-24 text-center text-xl font-black text-gold" />
                        </div>
                        {cvA !== null && cvB !== null && (
                            <div className="flex-1 min-w-[220px] glass-surface rounded-xl px-5 py-3.5 border border-white/8">
                                <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(168,169,173,0.5)" }}>
                                    Pick {cmpA} · <span style={{ color: valueColor(cvA*100) }}>{(cvA*100).toFixed(2)}</span>
                                    &nbsp;vs&nbsp;
                                    Pick {cmpB} · <span style={{ color: valueColor(cvB*100) }}>{(cvB*100).toFixed(2)}</span>
                                </div>
                                {cmpRatio === 1 ? (
                                    <div className="text-base font-black text-white">Both picks are equal value</div>
                                ) : (
                                    <div className="text-base font-black text-white">
                                        Pick {aHigher ? cmpA : cmpB} is <span className="text-gold">{dispRatio!.toFixed(2)}×</span> the value of Pick {aHigher ? cmpB : cmpA}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section> */}

                {/* ══ PICK LAB ══════════════════════════════════════════ */}
                <section className="glass-card rounded-2xl p-6 space-y-6">
                    {/* Title row */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="text-[11px] font-black tracking-[0.15em] uppercase text-gold" style={{ opacity: 0.6 }}>Pick Lab</h2>
                        <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/8 text-white/25">
                            Sandbox
                        </span>
                    </div>

                    {/* Centered mode toggle — connected pill */}
                    <div className="flex justify-center">
                        <div className="inline-flex p-1 rounded-full border border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
                            {(["analyze", "trade"] as const).map(v => (
                                <button key={v} onClick={() => setLabView(v)}
                                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                                        labView === v ? "bg-[#E6B85C] text-black" : "text-white/50 hover:text-white/80"
                                    }`}>
                                    {v === "analyze" ? "Analyze Pick" : "Trade Lab"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── ANALYZE MODE ── */}
                    {labView === "analyze" && (
                        <div className="space-y-6">
                            <PickConfigPanel config={aCfg} onChange={u => setACfg(c => ({...c,...u}))} />

                            {aResult && (
                                <div className="space-y-5 pt-4 border-t border-white/6">
                                    <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-5 items-start">
                                        <EvCard result={aResult} cfg={aCfg} rate={discountRate} />

                                        <div className="space-y-4">
                                            {/* Chart */}
                                            {(() => {
                                                const dd = buildDistData(aResult);
                                                const sd = buildSwapData(aResult);
                                                if (sd) return (
                                                    <>
                                                        <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>
                                                            {aResult.type === "swap" && `${aResult.numTeams}-team swap · ${aResult.positionLabel} — Pelton value at each slot`}
                                                        </div>
                                                        <div className="h-44">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={sd} barCategoryGap="10%" barGap={1}>
                                                                    <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={false} />
                                                                    <YAxis tick={{ fontSize: 9, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={false} />
                                                                    <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(230,184,92,0.4)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#E6B85C", fontWeight: 600 }} labelFormatter={l => `Pick ${l}`} />
                                                                    <ReferenceLine y={aResult.rawEV} stroke="#E6B85C" strokeDasharray="4 2" strokeOpacity={0.7}
                                                                        label={{ value: `Swap EV ${aResult.rawEV.toFixed(1)}`, position: "insideTopRight", fill: "#E6B85C", fontSize: 10, fontWeight: 700 }} />
                                                                    {aResult.type === "swap" && Array.from({ length: aResult.numTeams }, (_, i) => (
                                                                        <Bar key={i} dataKey={`pick${i+1}`} name={`Pick ${i+1}`} fill={SWAP_COLORS[i]} fillOpacity={0.75} radius={[2,2,0,0]} />
                                                                    ))}
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </>
                                                );
                                                if (dd && dd.length > 1) return (
                                                    <>
                                                        <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(168,169,173,0.5)" }}>
                                                            {aResult.type === "protected"
                                                                ? "Value landscape — blue border = protected zone"
                                                                : "Pelton value at each possible slot"}
                                                        </div>
                                                        <div className="h-44">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={dd} barCategoryGap="8%">
                                                                    <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={false} />
                                                                    <YAxis tick={{ fontSize: 9, fill: "#A8A9AD" }} axisLine={{ stroke: "#333" }} tickLine={false} domain={[0,"auto"]} />
                                                                    <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(230,184,92,0.4)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#E6B85C", fontWeight: 600 }}
                                                                        formatter={(v: unknown, _: unknown, props: { payload?: { prot?: boolean } }) => [`${Number(v).toFixed(2)}${props.payload?.prot ? " · protected" : ""}`, "Pelton Value"]}
                                                                        labelFormatter={l => `Pick ${l}`} />
                                                                    <ReferenceLine y={aResult.rawEV} stroke="#E6B85C" strokeDasharray="4 2" strokeOpacity={0.7}
                                                                        label={{ value: `EV ${aResult.rawEV.toFixed(1)}`, position: "insideTopRight", fill: "#E6B85C", fontSize: 10, fontWeight: 700 }} />
                                                                    <Bar dataKey="value" radius={[3,3,0,0]}>
                                                                        {dd.map((e, i) => (
    <Cell key={i}
        fill={valueColor(e.value)}
        fillOpacity={e.opacity}
        stroke={e.prot ? "#3b82f6" : "none"}
        strokeWidth={e.prot ? 2.5 : 0}
    />
))}
                                                                    </Bar>
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </>
                                                );
                                                return null;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Formula */}
                                    <FormulaDisplay result={aResult} cfg={aCfg} rate={discountRate} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TRADE LAB MODE ── */}
                    {labView === "trade" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                                <TradeSide
                                    title="You Give"
                                    accent="#E6B85C"
                                    cfgs={tCfgsA}
                                    results={tResultsA}
                                    onChangeCfg={(i, u) => updateCfg(setTCfgsA, i, u)}
                                    onAdd={() => addCfg(setTCfgsA)}
                                    onRemove={i => removeCfg(setTCfgsA, i)}
                                />
                                <TradeSide
                                    title="You Receive"
                                    accent="#a855f7"
                                    cfgs={tCfgsB}
                                    results={tResultsB}
                                    onChangeCfg={(i, u) => updateCfg(setTCfgsB, i, u)}
                                    onAdd={() => addCfg(setTCfgsB)}
                                    onRemove={i => removeCfg(setTCfgsB, i)}
                                />
                            </div>

                            {/* Differential */}
                            <div className="rounded-xl p-5 border border-white/8" style={{ background: "rgba(0,0,0,0.35)" }}>
                                <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap">
                                    <div className="text-center">
                                        <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#E6B85C" }}>You Give</div>
                                        <div className="text-2xl font-black tabular-nums" style={{ color: valueColor(totalA) }}>{totalA.toFixed(1)}</div>
                                    </div>

                                    <div className="text-center px-2">
                                        <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(168,169,173,0.5)" }}>Differential</div>
                                        <div className="text-4xl font-black tabular-nums leading-none"
                                            style={{ color: Math.abs(tradeDiff) < 1 ? "#22c55e" : tradeDiff > 0 ? "#ef4444" : "#22c55e" }}>
                                            {tradeDiff > 0 ? "−" : "+"}{Math.abs(tradeDiff).toFixed(1)}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#a855f7" }}>You Receive</div>
                                        <div className="text-2xl font-black tabular-nums" style={{ color: valueColor(totalB) }}>{totalB.toFixed(1)}</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/6 text-center text-sm" style={{ color: "rgba(168,169,173,0.7)" }}>
                                    {Math.abs(tradeDiff) < 1 ? (
                                        <span className="text-green-400 font-semibold">Trade is approximately fair</span>
                                    ) : tradeDiff > 0 ? (
                                        <>You give up <span className="text-white font-semibold">{tradeDiff.toFixed(1)}</span> more value than you receive</>
                                    ) : (
                                        <>You receive <span className="text-white font-semibold">{Math.abs(tradeDiff).toFixed(1)}</span> more value than you give</>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── REAL PICKS (commented out, kept for future use) ──
                    labMode === "real" && (
                        <div>
                            Filter by year/round, select from pick list,
                            show Pelton EV vs sim EV comparison.
                        </div>
                    )
                    ── */}
                </section>

            </div>
        </div>
    );
}
