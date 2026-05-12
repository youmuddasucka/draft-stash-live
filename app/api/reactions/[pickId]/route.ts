import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pickId: string }> },
) {
  const { pickId } = await params;
  const supabase = createSupabaseAdmin();

  const { data } = await supabase
    .from("reactions")
    .select("too_high, too_low, incorrect")
    .eq("pick_id", pickId)
    .maybeSingle();

  return NextResponse.json(data ?? { too_high: 0, too_low: 0, incorrect: 0 });
}
