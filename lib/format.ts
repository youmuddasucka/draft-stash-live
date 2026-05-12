export const fmt1 = (v: number) =>
    v.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
  

export const fmt2 = (v: number) =>
    v.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        });