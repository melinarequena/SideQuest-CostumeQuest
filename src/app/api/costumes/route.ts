import { NextResponse } from "next/server";
import { authenticatedClient, errorResponse, HttpError } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const { client } = await authenticatedClient(request);
    const { data, error } = await client.rpc("list_costumes");
    if (error) throw new HttpError(error.code === "55000" ? 423 : error.code === "42501" ? 403 : 500, error.code === "55000" ? "La votación está cerrada." : error.code === "42501" ? "Tu sesión no está disponible. Recargá la página." : "No pudimos cargar los disfraces.");
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
