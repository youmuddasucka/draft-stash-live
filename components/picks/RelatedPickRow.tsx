import type { SimPickCard } from "@/lib/loadSimPickCards";
import { evStyles } from "@/lib/picks/evColor";
import { abbrFor, cityFor, roundLabel, getPickTypeInfo } from "@/lib/picks/utils";

export default function RelatedPickRow({ pick }: { pick: SimPickCard }) {
    const originAbbr = abbrFor(pick.original_team);
    const { bg, text } = evStyles(pick.ev, pick.round);
    const typeInfo = getPickTypeInfo(pick.pick_type);
    const primaryOwner = pick.ownership[0];
    const isMulti = pick.ownership.length > 1;
    const isOwnPick = !isMulti && primaryOwner?.team === pick.original_team;

    return (
        <a
            href={`/picks/${pick.year}/${pick.round}/${originAbbr.toLowerCase()}`}
            className="glass-row flex items-center gap-4 rounded-xl px-4 py-3"
        >
            <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-[#0a0a0a] shrink-0 flex items-center justify-center">
                <img src={`/team-logos/${originAbbr}.png`} alt={originAbbr} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{pick.original_team}</div>
                <div className="text-[10px] opacity-50 mt-0.5">
                    {pick.year} · {roundLabel(pick.round)}
                    {!isOwnPick && primaryOwner && ` · Owned by ${cityFor(primaryOwner.team)}`}
                    {isMulti && ` · ${pick.ownership.length} possible owners`}
                </div>
            </div>
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border bg-neutral-900/60"
                style={{ borderColor: typeInfo.borderColor, color: typeInfo.borderColor }}>
                {typeInfo.tag}
            </span>
            <div className={`shrink-0 rounded-md ${bg} ${text} px-2.5 py-1 text-sm font-black`}>
                {pick.ev.toFixed(1)}
            </div>
            <span className="text-white/20 text-xs shrink-0">→</span>
        </a>
    );
}
