import { NextResponse } from "next/server";
import { checkAdminOrigin, privateHeaders, requireAdmin } from "@/lib/admin-server";
import { checkBodySize, errorResponse, HttpError } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkAdminOrigin(request); checkBodySize(request);
    const client = await requireAdmin();
    const body = await request.json();
    if (typeof body?.enabled !== "boolean") throw new HttpError(400, "Elegí si querés abrir o cerrar la votación.");
    const { data, error } = await client.rpc("set_voting_enabled", { p_enabled: body.enabled });
    if (error) throw new HttpError(503, "No pudimos cambiar la votación. Actualizá para comprobar su estado.");
    return NextResponse.json({ votingEnabled: data }, { headers: privateHeaders });
  } catch (error) { const response = errorResponse(error); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
