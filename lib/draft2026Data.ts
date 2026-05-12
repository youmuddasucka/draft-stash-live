// ── Draft data ────────────────────────────────────────────────────────────────

// Each entry = the team that OWNS (selects with) this pick slot.
// note = the team whose draft slot position it originally was.

export interface DraftEntry {
    id: string;
    name: string;
    city: string;
    espnAbbrev: string;
    record?: string;
    combos: number;
    isLottery: boolean;
    note?: string;
}

export const LOTTERY_TEAMS: DraftEntry[] = [
    { id: "WAS", name: "Washington Wizards",     city: "Washington",    espnAbbrev: "wsh",  record: "17-65", combos: 140, isLottery: true },
    { id: "UTA", name: "Utah Jazz",              city: "Utah",          espnAbbrev: "utah", record: "22-60", combos: 115, isLottery: true },
    { id: "MEM", name: "Memphis Grizzlies",      city: "Memphis",       espnAbbrev: "mem",  record: "25-57", combos: 90,  isLottery: true },
    { id: "CHI", name: "Chicago Bulls",          city: "Chicago",       espnAbbrev: "chi",  record: "31-51", combos: 45,  isLottery: true },
    { id: "LAC", name: "LA Clippers",            city: "LA",            espnAbbrev: "lac",  record: "19-63", combos: 140, isLottery: true, note: "via IND" },
    { id: "BKN", name: "Brooklyn Nets",          city: "Brooklyn",      espnAbbrev: "bkn",  record: "20-62", combos: 140, isLottery: true },
    { id: "SAC", name: "Sacramento Kings",       city: "Sacramento",    espnAbbrev: "sac",  record: "22-60", combos: 115, isLottery: true },
    { id: "ATL", name: "Atlanta Hawks",          city: "Atlanta",       espnAbbrev: "atl",  record: "26-56", combos: 75,  isLottery: true, note: "via NOP" },
    { id: "DAL", name: "Dallas Mavericks",       city: "Dallas",        espnAbbrev: "dal",  record: "26-56", combos: 60,  isLottery: true },
    { id: "MIL", name: "Milwaukee Bucks",        city: "Milwaukee",     espnAbbrev: "mil",  record: "32-50", combos: 30,  isLottery: true },
    { id: "GSW", name: "Golden State Warriors",  city: "Golden State",  espnAbbrev: "gs",   record: "37-45", combos: 20,  isLottery: true },
    { id: "OKC", name: "Oklahoma City Thunder",  city: "Oklahoma City", espnAbbrev: "okc",  record: "42-40", combos: 15,  isLottery: true, note: "via LAC" },
    { id: "MIA", name: "Miami Heat",             city: "Miami",         espnAbbrev: "mia",  record: "43-39", combos: 10,  isLottery: true },
    { id: "CHA", name: "Charlotte Hornets",      city: "Charlotte",     espnAbbrev: "cha",  record: "44-38", combos: 5,   isLottery: true },
];

export const PLAYOFF_TEAMS: DraftEntry[] = [
    { id: "CHI", name: "Chicago Bulls",           city: "Chicago",       espnAbbrev: "chi",  combos: 0, isLottery: false, note: "via POR" },
    { id: "MEM", name: "Memphis Grizzlies",       city: "Memphis",       espnAbbrev: "mem",  combos: 0, isLottery: false, note: "via PHX" },
    { id: "OKC", name: "Oklahoma City Thunder",   city: "Oklahoma City", espnAbbrev: "okc",  combos: 0, isLottery: false, note: "via PHI" },
    { id: "CHA", name: "Charlotte Hornets",       city: "Charlotte",     espnAbbrev: "cha",  combos: 0, isLottery: false, note: "via ORL" },
    { id: "TOR", name: "Toronto Raptors",         city: "Toronto",       espnAbbrev: "tor",  combos: 0, isLottery: false },
    { id: "SAS", name: "San Antonio Spurs",       city: "San Antonio",   espnAbbrev: "sa",   combos: 0, isLottery: false, note: "via ATL" },
    { id: "DET", name: "Detroit Pistons",         city: "Detroit",       espnAbbrev: "det",  combos: 0, isLottery: false, note: "via MIN" },
    { id: "PHI", name: "Philadelphia 76ers",      city: "Philadelphia",  espnAbbrev: "phi",  combos: 0, isLottery: false, note: "via HOU" },
    { id: "ATL", name: "Atlanta Hawks",           city: "Atlanta",       espnAbbrev: "atl",  combos: 0, isLottery: false, note: "via CLE" },
    { id: "NYK", name: "New York Knicks",         city: "New York",      espnAbbrev: "ny",   combos: 0, isLottery: false },
    { id: "LAL", name: "Los Angeles Lakers",      city: "LA",            espnAbbrev: "lal",  combos: 0, isLottery: false },
    { id: "DEN", name: "Denver Nuggets",          city: "Denver",        espnAbbrev: "den",  combos: 0, isLottery: false },
    { id: "BOS", name: "Boston Celtics",          city: "Boston",        espnAbbrev: "bos",  combos: 0, isLottery: false },
    { id: "MIN", name: "Minnesota Timberwolves",  city: "Minnesota",     espnAbbrev: "min",  combos: 0, isLottery: false, note: "via DET" },
    { id: "CLE", name: "Cleveland Cavaliers",     city: "Cleveland",     espnAbbrev: "cle",  combos: 0, isLottery: false, note: "via SAS" },
    { id: "DAL", name: "Dallas Mavericks",        city: "Dallas",        espnAbbrev: "dal",  combos: 0, isLottery: false, note: "via OKC" },
];

export const ROUND2_TEAMS: DraftEntry[] = [
    { id: "NYK", name: "New York Knicks",          city: "New York",      espnAbbrev: "ny",   combos: 0, isLottery: false, note: "via WAS" },
    { id: "MEM", name: "Memphis Grizzlies",        city: "Memphis",       espnAbbrev: "mem",  combos: 0, isLottery: false, note: "via IND" },
    { id: "BKN", name: "Brooklyn Nets",            city: "Brooklyn",      espnAbbrev: "bkn",  combos: 0, isLottery: false },
    { id: "SAC", name: "Sacramento Kings",         city: "Sacramento",    espnAbbrev: "sac",  combos: 0, isLottery: false },
    { id: "SAS", name: "San Antonio Spurs",        city: "San Antonio",   espnAbbrev: "sa",   combos: 0, isLottery: false, note: "via UTA" },
    { id: "LAC", name: "LA Clippers",              city: "LA",            espnAbbrev: "lac",  combos: 0, isLottery: false, note: "via MEM" },
    { id: "OKC", name: "Oklahoma City Thunder",    city: "Oklahoma City", espnAbbrev: "okc",  combos: 0, isLottery: false, note: "via DAL" },
    { id: "CHI", name: "Chicago Bulls",            city: "Chicago",       espnAbbrev: "chi",  combos: 0, isLottery: false, note: "via NOP" },
    { id: "HOU", name: "Houston Rockets",          city: "Houston",       espnAbbrev: "hou",  combos: 0, isLottery: false, note: "via CHI" },
    { id: "BOS", name: "Boston Celtics",           city: "Boston",        espnAbbrev: "bos",  combos: 0, isLottery: false, note: "via MIL" },
    { id: "MIA", name: "Miami Heat",               city: "Miami",         espnAbbrev: "mia",  combos: 0, isLottery: false, note: "via GSW" },
    { id: "SAS", name: "San Antonio Spurs",        city: "San Antonio",   espnAbbrev: "sa",   combos: 0, isLottery: false, note: "via POR" },
    { id: "BKN", name: "Brooklyn Nets",            city: "Brooklyn",      espnAbbrev: "bkn",  combos: 0, isLottery: false, note: "via LAC" },
    { id: "SAS", name: "San Antonio Spurs",        city: "San Antonio",   espnAbbrev: "sa",   combos: 0, isLottery: false, note: "via MIA" },
    { id: "SAC", name: "Sacramento Kings",         city: "Sacramento",    espnAbbrev: "sac",  combos: 0, isLottery: false, note: "via CHA" },
    { id: "ORL", name: "Orlando Magic",            city: "Orlando",       espnAbbrev: "orl",  combos: 0, isLottery: false },
    { id: "PHX", name: "Phoenix Suns",             city: "Phoenix",       espnAbbrev: "phx",  combos: 0, isLottery: false, note: "via PHI" },
    { id: "DAL", name: "Dallas Mavericks",         city: "Dallas",        espnAbbrev: "dal",  combos: 0, isLottery: false, note: "via PHX" },
    { id: "DEN", name: "Denver Nuggets",           city: "Denver",        espnAbbrev: "den",  combos: 0, isLottery: false, note: "via ATL" },
    { id: "TOR", name: "Toronto Raptors",          city: "Toronto",       espnAbbrev: "tor",  combos: 0, isLottery: false },
    { id: "WAS", name: "Washington Wizards",       city: "Washington",    espnAbbrev: "wsh",  combos: 0, isLottery: false, note: "via MIN" },
    { id: "LAC", name: "LA Clippers",              city: "LA",            espnAbbrev: "lac",  combos: 0, isLottery: false, note: "via CLE" },
    { id: "HOU", name: "Houston Rockets",          city: "Houston",       espnAbbrev: "hou",  combos: 0, isLottery: false },
    { id: "GSW", name: "Golden State Warriors",    city: "Golden State",  espnAbbrev: "gs",   combos: 0, isLottery: false, note: "via LAL" },
    { id: "NYK", name: "New York Knicks",          city: "New York",      espnAbbrev: "ny",   combos: 0, isLottery: false },
    { id: "CHI", name: "Chicago Bulls",            city: "Chicago",       espnAbbrev: "chi",  combos: 0, isLottery: false, note: "via DEN" },
    { id: "ATL", name: "Atlanta Hawks",            city: "Atlanta",       espnAbbrev: "atl",  combos: 0, isLottery: false, note: "via BOS" },
    { id: "NOP", name: "New Orleans Pelicans",     city: "New Orleans",   espnAbbrev: "no",   combos: 0, isLottery: false, note: "via DET" },
    { id: "MIN", name: "Minnesota Timberwolves",   city: "Minnesota",     espnAbbrev: "min",  combos: 0, isLottery: false, note: "via SAS" },
    { id: "WAS", name: "Washington Wizards",       city: "Washington",    espnAbbrev: "wsh",  combos: 0, isLottery: false, note: "via OKC" },
];
