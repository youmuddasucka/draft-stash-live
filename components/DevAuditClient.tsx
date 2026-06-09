"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AuditGroup } from "@/app/dev/page";

const TYPE_LABEL: Record<string, string> = {
  nested_swap:      "NESTED SWAP",
  triple_swap:      "TRIPLE SWAP",
  pro_triple_swap:  "PRO TRIPLE",
  unpro_swap:       "SWAP",
  pro_swap:         "PRO SWAP",
  special:          "SPECIAL",
  pro_backup_branched: "BRANCHED",
  pro_backup:       "PRO FALLBACK",
  unpro_backup:     "FALLBACK",
  pro_pick:         "PROTECTED",
};

const TYPE_COLOR: Record<string, string> = {
  nested_swap:      "#a78bfa",
  triple_swap:      "#818cf8",
  pro_triple_swap:  "#6366f1",
  unpro_swap:       "#34d399",
  pro_swap:         "#10b981",
  special:          "#f59e0b",
  pro_backup_branched: "#fb923c",
  pro_backup:       "#f87171",
  unpro_backup:     "#fca5a5",
  pro_pick:         "#60a5fa",
};

const STORAGE_KEY = "dev-audit-dismissed";

export default function DevAuditClient({ groups }: { groups: AuditGroup[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}
    setMounted(true);
  }, []);

  function dismiss(id: string) {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function restoreAll() {
    setDismissed(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const visible = groups.filter(g => !dismissed.has(g.id));
  const remaining = visible.length;

  if (!mounted) return null;

  return (
    <div className="glass-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight">Pick Audit</h1>
            <p className="text-sm text-white/60">Non-unprotected picks only · dismiss when verified</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-surface rounded-xl border border-white/10 px-5 py-3 text-center">
              <div className="text-4xl font-black">{remaining}</div>
              <div className="text-xs uppercase tracking-widest text-white/60 mt-0.5">remaining</div>
            </div>
            {dismissed.size > 0 && (
              <button
                onClick={restoreAll}
                className="text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity font-bold"
              >
                restore all
              </button>
            )}
          </div>
        </div>

        {/* Groups */}
        {remaining === 0 ? (
          <div className="text-center py-20 opacity-40 text-base tracking-wide">
            All picks verified ✓
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {visible.map(group => {
              const color = TYPE_COLOR[group.type] ?? "#888";
              const label = TYPE_LABEL[group.type] ?? group.type.toUpperCase();

              // Group picks by year+round combos for compact display
              const byYearRound = new Map<string, { abbr: string; year: number; round: number }[]>();
              for (const p of group.picks) {
                const key = `${p.year} R${p.round}`;
                if (!byYearRound.has(key)) byYearRound.set(key, []);
                byYearRound.get(key)!.push(p);
              }

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 flex items-center gap-5"
                >
                  {/* Type badge */}
                  <div
                    className="shrink-0 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-md border"
                    style={{ color, borderColor: color + "70", background: color + "20" }}
                  >
                    {label}
                  </div>

                  {/* Picks */}
                  <div className="flex-1 flex flex-wrap gap-x-5 gap-y-1.5 min-w-0">
                    {[...byYearRound.entries()].map(([yr, picks]) => (
                      <div key={yr} className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white/60 shrink-0">{yr}</span>
                        <span className="text-base font-bold text-white">
                          {picks.map((p, i) => (
                            <span key={p.abbr}>
                              {i > 0 && <span className="text-white/40"> · </span>}
                              <Link
                                href={`/picks/${p.year}/${p.round}/${p.abbr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-yellow-300 transition-colors"
                              >
                                {p.abbr}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Swap ID */}
                  {group.id !== group.picks[0]?.pick_id && (
                    <span className="text-xs font-mono text-white/40 shrink-0 hidden sm:block">
                      {group.id}
                    </span>
                  )}

                  {/* Dismiss */}
                  <button
                    onClick={() => dismiss(group.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-white/15 hover:border-red-400/60 hover:bg-red-400/10 text-white/40 hover:text-red-400 transition-all text-sm font-black"
                    title="Mark as verified"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
