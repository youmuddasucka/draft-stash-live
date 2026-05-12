"use client";

import { useState, useMemo } from "react";
import TeamSimPickCard from "@/lib/picks/TeamSimPickCard";
import type { SimTeamPickCard } from "@/lib/loadSimTeamPickCards";

type SortKey = "year" | "value";

type Props = {
    title: string;
    cards: SimTeamPickCard[];
    slotMap: Record<string, number>;
    swapPositions?: Record<string, string>;
};

export default function TeamPicksSection({ title, cards, slotMap, swapPositions = {} }: Props) {
    const [sortBy, setSortBy] = useState<SortKey>("year");

    const sorted = useMemo(() => {
        return [...cards].sort((a, b) => {
            if (sortBy === "year") return a.year !== b.year ? a.year - b.year : b.conditional_ev - a.conditional_ev;
            return b.conditional_ev - a.conditional_ev;
        });
    }, [cards, sortBy]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">{title} <span className="opacity-50 font-normal">({cards.length})</span></h2>

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
            ) : (
                <div className="space-y-3">
                    {sorted.map(card => (
                        <TeamSimPickCard
                            key={card.pick_id}
                            card={card}
                            expectedSlot={slotMap[card.pick_id]}
                            swapPosition={swapPositions[card.pick_id]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
