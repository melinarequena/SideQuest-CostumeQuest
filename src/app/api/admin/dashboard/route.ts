import { NextResponse } from "next/server";
import { privateHeaders, requireAdmin } from "@/lib/admin-server";
import { errorResponse, HttpError } from "@/lib/server";
import type { Dashboard } from "@/lib/admin-types";
import { rankCostumes } from "@/lib/podium";

export async function GET() {
  try {
    const client = await requireAdmin();
    const { data, error } = await client.rpc("quest_dashboard");
    if (error) throw new HttpError(503, "No pudimos cargar los resultados.");
    // Also normalize older databases that still return shared places for ties.
    const dashboard = data as Dashboard;
    return NextResponse.json({ ...dashboard, ranking: rankCostumes(dashboard.ranking) }, { headers: privateHeaders });
  } catch (error) { const response = errorResponse(error); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
