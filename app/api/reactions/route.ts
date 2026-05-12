import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

type ReactionCol = "too_high" | "too_low" | "incorrect";
const VALID_COLS: ReactionCol[] = ["too_high", "too_low", "incorrect"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { pick_id, reaction_type, delta } = body ?? {};

  if (
    !pick_id ||
    !VALID_COLS.includes(reaction_type) ||
    (delta !== 1 && delta !== -1)
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const col = reaction_type as ReactionCol;
  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("reactions")
    .select("too_high, too_low, incorrect")
    .eq("pick_id", pick_id)
    .maybeSingle();

  if (!existing) {
    if (delta === 1) {
      await supabase.from("reactions").insert({ pick_id, [col]: 1 });
    }
  } else {
    const newVal = Math.max(0, (existing[col] as number) + delta);
    await supabase.from("reactions").update({ [col]: newVal }).eq("pick_id", pick_id);
  }

  return NextResponse.json({ ok: true });
}
