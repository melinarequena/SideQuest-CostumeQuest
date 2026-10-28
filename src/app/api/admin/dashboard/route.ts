import { NextResponse } from "next/server";
import { privateHeaders, requireAdmin } from "@/lib/admin-server";
import { errorResponse, HttpError } from "@/lib/server";

export async function GET() {
  try {
    const client = await requireAdmin();
    const { data, error } = await client.rpc("quest_dashboard");
    if (error) throw new HttpError(503, "No pudimos cargar los resultados.");
    return NextResponse.json(data, { headers: privateHeaders });
  } catch (error) { const response = errorResponse(error); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
