export type EvStyle = { bg: string; text: string; glow: string };

export function evStyles(val: number, round: number): EvStyle {
    // Thresholds mirror valueColor in ValueScaleClient.
    if (val >= 77.5) return {
        bg: "bg-linear-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B]",
        text: "text-black",
        glow: "shadow-[0_0_20px_rgba(255,215,0,0.6)]",
    };

    if (round === 1) {
        if (val >= 55) return { bg: "bg-[#14532d]", text: "text-white", glow: "" }; // dark green
        if (val >= 42) return { bg: "bg-[#16a34a]", text: "text-white", glow: "" };
        if (val >= 30) return { bg: "bg-[#4ade80]", text: "text-black", glow: "" };
        if (val >= 23) return { bg: "bg-[#86efac]", text: "text-black", glow: "" };
        return                { bg: "bg-[#d1fae5]", text: "text-black", glow: "" }; // light green — bottom of round 1
    }

    // 2nd round: yellow → orange → red (mirrors valueColor in ValueScaleClient)
    if (val >= 13)  return { bg: "bg-[#fde047]", text: "text-black", glow: "" }; // yellow — top of round 2
    if (val >= 11)  return { bg: "bg-[#fbbf24]", text: "text-black", glow: "" };
    if (val >= 9)   return { bg: "bg-[#fb923c]", text: "text-black", glow: "" }; // orange
    if (val >= 7)   return { bg: "bg-[#f97316]", text: "text-black", glow: "" };
    if (val >= 5)   return { bg: "bg-[#ea580c]", text: "text-white", glow: "" };
    if (val >= 3.5) return { bg: "bg-[#dc2626]", text: "text-white", glow: "" }; // red
    return                  { bg: "bg-[#991b1b]", text: "text-white", glow: "" }; // dark red
}
