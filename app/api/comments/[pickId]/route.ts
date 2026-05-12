import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pickId: string }> },
) {
  const { pickId } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at")
    .eq("pick_id", pickId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
