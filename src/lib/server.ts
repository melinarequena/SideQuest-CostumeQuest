import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new HttpError(503, "La app todavía no está conectada a Supabase.");
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) throw new HttpError(401, "Tu sesión no está disponible. Recargá la página.");
  const client = createClient(url, key, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(bearer.slice(7));
  if (error || !user) throw new HttpError(401, "Tu sesión venció. Recargá la página.");
  return { client, user };
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  console.error("Costume Quest request failed", error instanceof Error ? error.message : "Backend error");
  return NextResponse.json({ error: "No pudimos completar la operación. Intentá de nuevo." }, { status: 500 });
}
export function checkBodySize(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4096) throw new HttpError(413, "Los datos enviados son demasiado grandes.");
}
