import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ votingEnabled: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("get_voting_status");
  return NextResponse.json({ votingEnabled: !error && data === true }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
