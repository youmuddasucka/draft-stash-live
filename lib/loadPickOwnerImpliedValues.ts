// lib/loadPickOwnerImpliedValues.ts
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export type PickOwnerSlice = {
    pick_id: string;
    owner: string;
    implied_value: number;
};

export function loadPickOwnerImpliedValues(): PickOwnerSlice[] {
    const filePath = path.join(
        process.cwd(),
        "data/picks/pick_owner_implied_values.csv"
    );

    const csv = fs.readFileSync(filePath, "utf8");

    const { data } = Papa.parse<PickOwnerSlice>(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    return data.map((row) => ({
        ...row,
        implied_value:
            typeof row.implied_value === "number"
                ? row.implied_value * 100
                : row.implied_value,
    }));
}
