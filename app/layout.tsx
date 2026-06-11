import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { teamColors } from "@/components/teamColors";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import MobileNav from "@/components/MobileNav";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-header",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Draft Stash",
  description: "NBA draft pick stash dashboard",
};

// TEAM LIST
const TEAMS = [
  "ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS"
];

// YEARS
const PICK_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

// ROUNDS
const ROUNDS: Array<1 | 2> = [1, 2];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-black text-white">
        <div className="min-h-screen flex flex-col">

          {/* NAVBAR */}
          <header className="bg-[#E6B85C] border-b border-black/10 relative z-50 shadow-sm">

            {/* MOBILE BAR */}
            <div className="md:hidden flex items-center justify-between px-4 py-2">
              <Link href="/">
                <img src="/banner.png" alt="Draft Stash" className="h-8" />
              </Link>
              <MobileNav teams={TEAMS} years={PICK_YEARS} rounds={ROUNDS} />
            </div>

            <nav className="font-header mx-auto hidden md:grid max-w-7xl grid-cols-3 items-center px-6 py-3">

              {/* LEFT */}
              <div className="flex items-center">
                <Link
                  href="/"
                  className="text-sm font-bold tracking-tight text-black hover:text-white whitespace-nowrap"
                >
                  DRAFT STASH
                </Link>
              </div>

              {/* CENTER LOGO */}
              <div className="flex justify-center">
                <Link href="/">
                  <img src="/banner.png" alt="Draft Stash" className="h-10" />
                </Link>
              </div>

              {/* RIGHT */}
              <div className="flex justify-end items-center gap-5 text-xs font-bold text-black">

                <Link href="/" className="hover:text-white whitespace-nowrap">
                  HOME
                </Link>

                {/* TEAMS */}
                <div className="relative group">
                  <button className="hover:text-white whitespace-nowrap">
                    TEAMS
                  </button>

                  <div className="absolute right-0 pt-2 hidden group-hover:block z-50">
                    <div className="grid grid-cols-5 gap-2 w-[280px] rounded-xl border border-neutral-800 bg-black p-3 text-[10px] shadow-2xl">
                      {TEAMS.map((abbr) => {
                        const bgColor = teamColors[abbr] || "#333";
                        const isLight = ["GSW", "IND"].includes(abbr);

                        return (
                          <Link
                            key={abbr}
                            href={`/teams/${abbr.toLowerCase()}`}
                            style={{ backgroundColor: bgColor }}
                            className={`rounded-md py-2 text-center font-bold transition hover:scale-110 hover:brightness-125 ${isLight ? "text-black" : "text-white"
                              }`}
                          >
                            {abbr}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* PICKS */}
                <div className="relative group">
                  <Link
                    href="/picks"
                    className="hover:text-white whitespace-nowrap"
                  >
                    PICKS
                  </Link>

                  <div className="absolute right-0 pt-2 hidden group-hover:block z-50">
                    <div className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-black p-2 shadow-2xl">

                      {/* ALL */}
                      <Link
                        href="/picks"
                        className="px-3 py-1.5 rounded-md text-white hover:bg-neutral-800 whitespace-nowrap"
                      >
                        ALL
                      </Link>

                      {/* YEAR */}
                      {PICK_YEARS.map((year) => (
                        <div key={year} className="relative group/year">
                          <Link
                            href={`/picks?year=${year}`}
                            className="block px-3 py-1.5 rounded-md text-white hover:bg-neutral-800 cursor-pointer whitespace-nowrap"
                          >
                            {year}
                          </Link>

                          {/* ROUND DROPDOWN */}
                          <div className="absolute right-full top-0 mr-2 hidden group-hover/year:block z-50">
                            <div className="absolute right-[-16px] top-0 w-4 h-full" />

                            <div className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-black p-2 shadow-2xl">
                              {ROUNDS.map((round) => (
                                <div key={`${year}-${round}`} className="relative group/round">
                                  <Link
                                    href={`/picks?year=${year}&round=${round}`}
                                    className="block px-3 py-1.5 rounded-md text-white hover:bg-neutral-800 cursor-pointer whitespace-nowrap"
                                  >
                                    Round {round}
                                  </Link>

                                  {/* TEAMS */}
                                  <div className="absolute right-full top-0 mr-2 hidden group-hover/round:block z-50">
                                    <div className="absolute right-[-16px] top-0 w-4 h-full" />

                                    <div className="grid grid-cols-5 gap-2 w-[280px] rounded-xl border border-neutral-800 bg-black p-3 text-[10px] shadow-2xl">
                                      {TEAMS.map((abbr) => {
                                        const bgColor = teamColors[abbr] || "#333";
                                        const isLight = ["GSW", "IND"].includes(abbr);

                                        return (
                                          <Link
                                            key={`${year}-${round}-${abbr}`}
                                            href={`/picks/${year}/${round}/${abbr.toLowerCase()}`}
                                            style={{ backgroundColor: bgColor }}
                                            className={`rounded-md py-2 text-center font-bold transition hover:scale-110 hover:brightness-125 ${isLight ? "text-black" : "text-white"
                                              }`}
                                          >
                                            {abbr}
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* <Link
                  href="/projected-standings"
                  className="hover:text-white whitespace-nowrap"
                >
                  PROJECTED STANDINGS
                </Link> */}

                <Link
                  href="/stash-value"
                  className="hover:text-white whitespace-nowrap"
                >
                  STASH VALUE
                </Link>

                <Link
                  href="/about"
                  className="hover:text-white whitespace-nowrap"
                >
                  ABOUT
                </Link>

                {/* <Link
                  href="/dev"
                  className="hover:text-white whitespace-nowrap opacity-50"
                >
                  DEV
                </Link> */}
              </div>
            </nav>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 bg-black px-4 md:px-8 py-6">
            {children}
          </main>

        </div>
        <Analytics />
      </body>
    </html>
  );
}