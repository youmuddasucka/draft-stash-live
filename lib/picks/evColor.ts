export type EvStyle = { bg: string; text: string; glow: string };

export function evStyles(val: number, round: number): EvStyle {
    if (val >= 62) return {
        bg: "bg-linear-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B]",
        text: "text-black",
        glow: "shadow-[0_0_20px_rgba(255,215,0,0.6)]",
    };

    if (round === 1) {
        if (val >= 50) return { bg: "bg-[#14532d]", text: "text-white", glow: "" };
        if (val >= 38) return { bg: "bg-[#16a34a]", text: "text-white", glow: "" };
        if (val >= 27) return { bg: "bg-[#4ade80]", text: "text-black", glow: "" };
        if (val >= 17) return { bg: "bg-[#86efac]", text: "text-black", glow: "" };
        return                { bg: "bg-[#d1fae5]", text: "text-black", glow: "" };
    }

    // 2nd round: orange → red
    if (val >= 7)   return { bg: "bg-[#ea580c]", text: "text-white", glow: "" };
    if (val >= 5.5) return { bg: "bg-[#f97316]", text: "text-black", glow: "" };
    if (val >= 4)   return { bg: "bg-[#fb923c]", text: "text-black", glow: "" };
    if (val >= 2.5) return { bg: "bg-[#dc2626]", text: "text-white", glow: "" };
    return                  { bg: "bg-[#7f1d1d]", text: "text-white", glow: "" };
}
