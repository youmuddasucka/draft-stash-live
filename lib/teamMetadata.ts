export const TEAM_METADATA: Record<
    string,
    { city: string; name: string; full: string }
> = {
    BKN: { city: "Brooklyn", name: "Nets", full: "Brooklyn Nets" },
    PHX: { city: "Phoenix", name: "Suns", full: "Phoenix Suns" },
    GSW: { city: "Golden State", name: "Warriors", full: "Golden State Warriors" },
    BOS: { city: "Boston", name: "Celtics", full: "Boston Celtics" },
    LAL: { city: "Los Angeles", name: "Lakers", full: "Los Angeles Lakers" },
    LAC: { city: "Los Angeles", name: "Clippers", full: "Los Angeles Clippers" },
    NYK: { city: "New York", name: "Knicks", full: "New York Knicks" },
    MIA: { city: "Miami", name: "Heat", full: "Miami Heat" },
    PHI: { city: "Philadelphia", name: "76ers", full: "Philadelphia 76ers" },
    CHI: { city: "Chicago", name: "Bulls", full: "Chicago Bulls" },
    MIL: { city: "Milwaukee", name: "Bucks", full: "Milwaukee Bucks" },
    CLE: { city: "Cleveland", name: "Cavaliers", full: "Cleveland Cavaliers" },
    DET: { city: "Detroit", name: "Pistons", full: "Detroit Pistons" },
    IND: { city: "Indiana", name: "Pacers", full: "Indiana Pacers" },
    ATL: { city: "Atlanta", name: "Hawks", full: "Atlanta Hawks" },
    ORL: { city: "Orlando", name: "Magic", full: "Orlando Magic" },
    TOR: { city: "Toronto", name: "Raptors", full: "Toronto Raptors" },
    WAS: { city: "Washington", name: "Wizards", full: "Washington Wizards" },
    CHA: { city: "Charlotte", name: "Hornets", full: "Charlotte Hornets" },
    SAS: { city: "San Antonio", name: "Spurs", full: "San Antonio Spurs" },
    DAL: { city: "Dallas", name: "Mavericks", full: "Dallas Mavericks" },
    MEM: { city: "Memphis", name: "Grizzlies", full: "Memphis Grizzlies" },
    DEN: { city: "Denver", name: "Nuggets", full: "Denver Nuggets" },
    MIN: { city: "Minnesota", name: "Timberwolves", full: "Minnesota Timberwolves" },
    NOP: { city: "New Orleans", name: "Pelicans", full: "New Orleans Pelicans" },
    SAC: { city: "Sacramento", name: "Kings", full: "Sacramento Kings" },
    UTA: { city: "Utah", name: "Jazz", full: "Utah Jazz" },
    POR: { city: "Portland", name: "Trail Blazers", full: "Portland Trail Blazers" },
    HOU: { city: "Houston", name: "Rockets", full: "Houston Rockets" },
    OKC: { city: "Oklahoma City", name: "Thunder", full: "Oklahoma City Thunder" },
};

export const TEAM_FULL_TO_ABBR: Record<string, string> =
    Object.fromEntries(
        Object.entries(TEAM_METADATA).map(([abbr, meta]) => [
            meta.full,
            abbr,
        ])
    );
