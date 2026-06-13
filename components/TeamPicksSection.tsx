"use client";

import { useState, useMemo } from "react";
import TeamSimPickCard from "@/lib/picks/TeamSimPickCard";
import type { SimTeamPickCard } from "@/lib/loadSimTeamPickCards";
import { stashValue } from "@/lib/picks/utils";

type SortKey = "year" | "value";

type Props = {
    title: string;
    cards: SimTeamPickCard[];
    slotMap: Record<string, number>;
    swapPositions?: Record<string, string>;
    swapTitles?: Record<string, string>;
    swapPos?: Record<string, "best" | "mid" | "worst">;
    swapLogos?: Record<string, string[]>;
    pickTypeLabels?: Record<string, string>;
    stashOverrides?: Record<string, number>;
};

export default function TeamPicksSection({ title, cards, slotMap, swapPositions = {}, swapTitles = {}, swapPos = {}, swapLogos = {}, pickTypeLabels = {}, stashOverrides = {} }: Props) {
    const [sortBy, setSortBy] = useState<SortKey>("year");

    const stashOf = (c: SimTeamPickCard) => stashOverrides[c.pick_id] ?? stashValue(c);

    const sorted = useMemo(() => {
        return [...cards].sort((a, b) => {
            if (sortBy === "year") return a.year !== b.year ? a.year - b.year : stashOf(b) - stashOf(a);
            return stashOf(b) - stashOf(a);
        });
    }, [cards, sortBy]);

    // When sorted by year, split into per-year groups so we can show a subtle
    // year label above each (only years that actually have picks appear).
    const yearGroups = useMemo(() => {
        const groups: { year: number; cards: SimTeamPickCard[] }[] = [];
        for (const card of sorted) {
            const last = groups[groups.length - 1];
            if (last && last.year === card.year) last.cards.push(card);
            else groups.push({ year: card.year, cards: [card] });
        }
        return groups;
    }, [sorted]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-semibold">{title} <span className="opacity-50 font-normal">({cards.length})</span></h2>

                <div className="flex gap-1 text-xs">
                    <button
                        onClick={() => setSortBy("year")}
                        className={`px-2 py-1 rounded ${sortBy === "year" ? "bg-white text-black" : "bg-black/40"}`}
                    >
                        Year
                    </button>
                    <button
                        onClick={() => setSortBy("value")}
                        className={`px-2 py-1 rounded ${sortBy === "value" ? "bg-white text-black" : "bg-black/40"}`}
                    >
                        Value
                    </button>
                </div>
            </div>

            {sorted.length === 0 ? (
                <p className="text-xs opacity-60">No picks.</p>
            ) : sortBy === "year" ? (
                <div className="space-y-5">
                    {yearGroups.map(group => (
                        <div key={group.year} className="space-y-2">
                            <div className="text-xs font-medium tracking-wider opacity-40">{group.year}</div>
                            <div className="space-y-3">
                                {group.cards.map(card => (
                                    <TeamSimPickCard
                                        key={card.pick_id}
                                        card={card}
                                        expectedSlot={slotMap[card.pick_id]}
                                        swapPosition={swapPositions[card.pick_id]}
                                        swapTitle={swapTitles[card.pick_id]}
                                        swapPos={swapPos[card.pick_id]}
                                        swapLogos={swapLogos[card.pick_id]}
                                        pickTypeLabel={pickTypeLabels[card.pick_id]}
                                        stashOverride={stashOverrides[card.pick_id]}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map(card => (
                        <TeamSimPickCard
                            key={card.pick_id}
                            card={card}
                            expectedSlot={slotMap[card.pick_id]}
                            swapPosition={swapPositions[card.pick_id]}
                            swapTitle={swapTitles[card.pick_id]}
                            swapPos={swapPos[card.pick_id]}
                            swapLogos={swapLogos[card.pick_id]}
                            pickTypeLabel={pickTypeLabels[card.pick_id]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
