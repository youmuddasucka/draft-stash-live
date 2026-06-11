"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { teamColors } from "@/components/teamColors";

const LIGHT_TEAMS = ["GSW", "IND"];

function TeamGrid({
  teams,
  hrefFor,
  onNavigate,
}: {
  teams: string[];
  hrefFor: (abbr: string) => string;
  onNavigate: () => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 px-3 pb-3 pt-1">
      {teams.map((abbr) => {
        const bgColor = teamColors[abbr] || "#333";
        const isLight = LIGHT_TEAMS.includes(abbr);
        return (
          <Link
            key={abbr}
            href={hrefFor(abbr)}
            onClick={onNavigate}
            style={{ backgroundColor: bgColor }}
            className={`rounded-md py-2 text-center text-[10px] font-bold ${
              isLight ? "text-black" : "text-white"
            }`}
          >
            {abbr}
          </Link>
        );
      })}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MobileNav({
  teams,
  years,
  rounds,
}: {
  teams: string[];
  years: number[];
  rounds: Array<1 | 2>;
}) {
  const [open, setOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [picksOpen, setPicksOpen] = useState(false);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [openRound, setOpenRound] = useState<string | null>(null);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const close = () => setOpen(false);

  const rowClass =
    "flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-colors";

  return (
    <>
      {/* HAMBURGER (mobile bar) */}
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center text-black"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* BACKDROP — blurs the page behind the drawer */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* DRAWER */}
      <aside
        className={`fixed right-0 top-0 z-[110] flex h-full w-[82%] max-w-xs flex-col border-l border-neutral-800 bg-black shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <Link href="/" onClick={close} className="font-header text-sm font-bold tracking-tight text-gold">
            DRAFT STASH
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center text-white/70 hover:text-white"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <nav className="font-header flex-1 divide-y divide-neutral-900 overflow-y-auto">
          <Link href="/" onClick={close} className={rowClass}>
            HOME
          </Link>

          {/* TEAMS */}
          <div>
            <button type="button" onClick={() => setTeamsOpen((v) => !v)} className={rowClass}>
              <span>TEAMS</span>
              <Chevron open={teamsOpen} />
            </button>
            {teamsOpen && (
              <TeamGrid
                teams={teams}
                hrefFor={(abbr) => `/teams/${abbr.toLowerCase()}`}
                onNavigate={close}
              />
            )}
          </div>

          {/* PICKS */}
          <div>
            <button type="button" onClick={() => setPicksOpen((v) => !v)} className={rowClass}>
              <span>PICKS</span>
              <Chevron open={picksOpen} />
            </button>
            {picksOpen && (
              <div className="bg-white/[0.02]">
                <Link href="/picks" onClick={close} className={`${rowClass} pl-6`}>
                  ALL
                </Link>

                {years.map((year) => {
                  const yearOpen = openYear === year;
                  return (
                    <div key={year}>
                      <button
                        type="button"
                        onClick={() => setOpenYear(yearOpen ? null : year)}
                        className={`${rowClass} pl-6`}
                      >
                        <span>{year}</span>
                        <Chevron open={yearOpen} />
                      </button>

                      {yearOpen && (
                        <div className="bg-white/[0.02]">
                          <Link href={`/picks?year=${year}`} onClick={close} className={`${rowClass} pl-8 text-xs text-white/70`}>
                            ALL {year}
                          </Link>
                          {rounds.map((round) => {
                            const key = `${year}-${round}`;
                            const roundOpen = openRound === key;
                            return (
                              <div key={key}>
                                <button
                                  type="button"
                                  onClick={() => setOpenRound(roundOpen ? null : key)}
                                  className={`${rowClass} pl-8`}
                                >
                                  <span>Round {round}</span>
                                  <Chevron open={roundOpen} />
                                </button>
                                {roundOpen && (
                                  <TeamGrid
                                    teams={teams}
                                    hrefFor={(abbr) => `/picks/${year}/${round}/${abbr.toLowerCase()}`}
                                    onNavigate={close}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link href="/stash-value" onClick={close} className={rowClass}>
            STASH VALUE
          </Link>

          <Link href="/about" onClick={close} className={rowClass}>
            ABOUT
          </Link>
        </nav>
      </aside>
    </>
  );
}
