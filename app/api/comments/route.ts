import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { pick_id, content } = body ?? {};

  if (!pick_id || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (content.length > 800) {
    return NextResponse.json({ error: "Comment too long." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const supabase = createSupabaseAdmin();

  // 1 comment per 15 seconds
  const fifteenSecsAgo = new Date(Date.now() - 15_000).toISOString();
  const { count: recentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", fifteenSecsAgo);

  if ((recentCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "Please wait 15 seconds between comments." },
      { status: 429 },
    );
  }

  // 420 comments per hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: hourCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if ((hourCount ?? 0) >= 420) {
    return NextResponse.json(
      { error: "Too many comments this hour. Try again later." },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ pick_id, content: content.trim(), ip_hash: ipHash })
    .select("id, content, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
