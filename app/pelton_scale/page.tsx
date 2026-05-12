"use client";

import CompactPickSwapCardBothValues from "@/lib/picks/CompactPickSwapCardBothValues";


import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
} from "recharts";

/* ============================
   PELTON CURVE (×100)
============================ */

const PELTON_CURVE: Record<number, number> = {
    1: 1.0, 2: 0.775, 3: 0.6675, 4: 0.6025, 5: 0.56,
    6: 0.5275, 7: 0.5, 8: 0.4775, 9: 0.4575, 10: 0.43,
    11: 0.4, 12: 0.375, 13: 0.35, 14: 0.33, 15: 0.31,
    16: 0.295, 17: 0.2825, 18: 0.27, 19: 0.2575, 20: 0.245,
    21: 0.23, 22: 0.215, 23: 0.2, 24: 0.1875, 25: 0.175,
    26: 0.165, 27: 0.155, 28: 0.1425, 29: 0.13, 30: 0.1175,
    31: 0.09, 32: 0.0875, 33: 0.0825, 34: 0.08, 35: 0.075,
    36: 0.0725, 37: 0.07, 38: 0.0675, 39: 0.0625, 40: 0.06,
    41: 0.0575, 42: 0.055, 43: 0.0525, 44: 0.05, 45: 0.0475,
    46: 0.045, 47: 0.0425, 48: 0.04, 49: 0.0375, 50: 0.035,
    51: 0.0325, 52: 0.03, 53: 0.0275, 54: 0.025, 55: 0.0225,
    56: 0.0225, 57: 0.02, 58: 0.0175, 59: 0.015, 60: 0.0125,
};

const peltonData = Object.entries(PELTON_CURVE).map(([pick, value]) => ({
    pick: Number(pick),
    value: value * 100,
}));

const X_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

/* ============================
   PAGE
============================ */

export default function PeltonValueScalePage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

            {/* HEADER */}
            <header className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Kevin Pelton's Draft Value Curve
                </h1>
            </header>

            {/* CHART + TABLE */}
            <section className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8">

                {/* CHART (UNCHANGED HEIGHT) */}
                <div className="rounded-2xl border border-neutral-800 bg-b from-neutral-900/60 to-black/60 p-8 shadow-lg">
                    <h2 className="text-lg font-medium mb-6 text-neutral-200">
                        Value by Pick
                    </h2>

                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={peltonData}>
                                <XAxis
                                    dataKey="pick"
                                    ticks={X_TICKS}
                                    tick={{ fontSize: 10, fill: "#888" }}
                                    axisLine={{ stroke: "#444" }}
                                    tickLine={{ stroke: "#444" }}
                                />

                                <YAxis
                                    tick={{ fontSize: 10, fill: "#888" }}
                                    axisLine={{ stroke: "#444" }}
                                    tickLine={{ stroke: "#444" }}
                                />

                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#0a0a0a",
                                        border: "1px solid #E6B85C",
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                    labelStyle={{ color: "#E6B85C", fontWeight: 600 }}
                                    formatter={(value) => [`${Number(value).toFixed(2)}`, "Value"]}
                                    labelFormatter={(label) => `Pick ${label}`}
                                />

                                <ReferenceArea x1={1} x2={14} fill="#E6B85C" fillOpacity={0.08} />
                                <ReferenceArea x1={14} x2={30} fill="#ffffff" fillOpacity={0.025} />

                                <ReferenceLine
                                    x={14}
                                    stroke="#E6B85C"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.6}
                                    label={{
                                        value: "End of Lottery",
                                        position: "insideTop",
                                        fill: "#E6B85C",
                                        fontSize: 12,
                                    }}
                                />
                                <ReferenceLine
                                    x={30}
                                    stroke="#aaa"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.5}
                                    label={{
                                        value: "End of 1st",
                                        position: "insideTop",
                                        fill: "#aaa",
                                        fontSize: 12,
                                    }}
                                />

                                <defs>
                                    <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                                        <stop offset="0%"    stopColor="#D4AF37" /> {/* pick ~1   — gold */}
                                        <stop offset="4%"    stopColor="#14532d" /> {/* pick ~3   — dark green */}
                                        <stop offset="12%"   stopColor="#16a34a" /> {/* pick ~8   — medium green */}
                                        <stop offset="24%"   stopColor="#4ade80" /> {/* pick ~15  — bright green */}
                                        <stop offset="38%"   stopColor="#86efac" /> {/* pick ~23  — pale green */}
                                        <stop offset="49%"   stopColor="#d1fae5" /> {/* pick ~30  — end of 1st */}
                                        <stop offset="51%"   stopColor="#ea580c" /> {/* pick ~31  — vivid orange */}
                                        <stop offset="58%"   stopColor="#f97316" /> {/* pick ~35  — orange */}
                                        <stop offset="72%"   stopColor="#fb923c" /> {/* pick ~44  — light orange */}
                                        <stop offset="87%"   stopColor="#dc2626" /> {/* pick ~53  — red */}
                                        <stop offset="100%"  stopColor="#7f1d1d" /> {/* pick ~60  — dark red */}
                                    </linearGradient>
                                </defs>

                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="url(#lineGradient)"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TABLE (SHORTENED TO MATCH CHART) */}
                <div className="rounded-2xl border border-neutral-800 bg-black/50 p-6">
                    <h2 className="text-lg font-medium mb-4 text-neutral-200">
                        Pick Values
                    </h2>

                    {/* THIS is the key fix */}
                    <div className="h-96 overflow-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead className="sticky top-0 bg-black z-10">
                                <tr className="border-b border-neutral-700 text-neutral-400 uppercase tracking-wide">
                                    <th className="text-left py-2 px-3">Pick</th>
                                    <th className="text-right py-2 px-3">Value</th>
                                </tr>
                            </thead>

                            <tbody>
                                {peltonData.map((row) => (
                                    <tr
                                        key={row.pick}
                                        className={`
                      border-b border-neutral-800 last:border-0
                      ${row.pick <= 14 ? "bg-[#E6B85C]/10" : ""}
                      ${row.pick > 30 ? "opacity-60" : ""}
                    `}
                                    >
                                        <td className="py-1.5 px-3 font-mono text-neutral-300">
                                            {row.pick}
                                        </td>
                                        <td className="py-1 px-3 text-right font-mono font-medium text-neutral-100">
                                            {row.value.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-6 bg-neutral-950 min-h-screen">
                    <CompactPickSwapCardBothValues
                        pick={{
                            EV: 42.3,
                            best_EV: 51.2,
                            worst_EV: 28.7,
                            best_expected_draft_slot: 6.4,
                            worst_expected_draft_slot: 14.9,
                            round: 1,
                            year: 2026,
                            resolution_rate: 1,
                            rules: {
                                allocation: [
                                    { rank: "mf", to: "Buffalo Bills" },
                                    { rank: "lf", to: "New York Giants" },
                                ],
                            },
                        }}
                        slices={[{ owner: "test", implied_value: 0 }]}
                        originAbbr="DAL"
                        swapTeamAbbr="NYG"
                    />
                </div>
            </section>
        </div>
    );
}
