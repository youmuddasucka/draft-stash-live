// lib/employees.ts

export type TeamEmployees = {
    gm: string;
    coach: string;
};

export const TEAM_EMPLOYEES: Record<string, TeamEmployees> = {
    ATL: { gm: "Onsi Saleh", coach: "Quin Snyder" },
    BOS: { gm: "Brad Stevens", coach: "Joe Mazzulla" },
    BKN: { gm: "Sean Marks", coach: "Jordi Fernández" },
    CHA: { gm: "Jeff Peterson", coach: "Charles Lee" },
    CHI: { gm: "Bryson Graham", coach: "" },
    CLE: { gm: "Koby Altman", coach: "Kenny Atkinson" },
    DAL: { gm: "Masai Ujiri", coach: "" },
    DEN: { gm: "Ben Tenzer & Jonathan Wallace", coach: "David Adelman" },
    DET: { gm: "Trajan Langdon", coach: "J.B. Bickerstaff" },
    GSW: { gm: "Mike Dunleavy Jr.", coach: "Steve Kerr" },
    HOU: { gm: "Rafael Stone", coach: "Ime Udoka" },
    IND: { gm: "Kevin Pritchard", coach: "Rick Carlisle" },
    LAC: { gm: "Lawrence Frank", coach: "Tyronn Lue" },
    LAL: { gm: "Rob Pelinka", coach: "JJ Redick" },
    MEM: { gm: "Zach Kleiman", coach: "Tuomas Iisalo" },
    MIA: { gm: "Pat Riley", coach: "Erik Spoelstra" },
    MIL: { gm: "Jon Horst", coach: "Taylor Jenkins" },
    MIN: { gm: "Tim Connelly", coach: "Chris Finch" },
    NOP: { gm: "Joe Dumars", coach: "Jamahl Mosley" },
    NYK: { gm: "Leon Rose", coach: "Mike Brown" },
    OKC: { gm: "Sam Presti", coach: "Mark Daigneault" },
    ORL: { gm: "Anthony Parker", coach: "Sean Sweeney" },
    PHI: { gm: "Mike Gansey", coach: "Nick Nurse" },
    PHX: { gm: "Brian Gregory", coach: "Jordan Ott" },
    POR: { gm: "Joe Cronin", coach: "" },
    SAC: { gm: "Scott Perry", coach: "Doug Christie" },
    SAS: { gm: "Brian Wright", coach: "Mitch Johnson" },
    TOR: { gm: "Bobby Webster", coach: "Darko Rajaković" },
    UTA: { gm: "Danny Ainge", coach: "Will Hardy" },
    WAS: { gm: "Will Dawkins", coach: "Brian Keefe" },
};
  