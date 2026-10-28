import { NextResponse } from "next/server";
import { adminClient, checkAdminOrigin, clearAdminCookies, privateHeaders } from "@/lib/admin-server";
import { errorResponse } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkAdminOrigin(request);
    const client = await adminClient();
    try { await client.auth.signOut({ scope: "local" }); } finally { await clearAdminCookies(); }
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { const response = errorResponse(error); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
