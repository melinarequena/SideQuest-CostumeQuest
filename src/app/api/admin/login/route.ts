import { NextResponse } from "next/server";
import {
  adminClient,
  checkAdminOrigin,
  privateHeaders,
} from "@/lib/admin-server";
import { checkBodySize, errorResponse, HttpError } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkAdminOrigin(request);
    checkBodySize(request);
    const email = process.env.QUEST_ADMIN_EMAIL;
    if (!email)
      throw new HttpError(503, "Falta configurar la cuenta de Nacho.");
    const body = await request.json();
    if (
      typeof body?.password !== "string" ||
      !body.password ||
      body.password.length > 256
    )
      throw new HttpError(400, "Ingresá tu contraseña.");
    const client = await adminClient();
    const { error } = await client.auth.signInWithPassword({
      email,
      password: body.password,
    });
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 401,
        error.status === 429
          ? "Demasiados intentos. Esperá unos minutos e intentá de nuevo."
          : "La contraseña no es correcta.",
      );
    const permission = await client.rpc("is_quest_admin");
    if (permission.error || permission.data !== true) {
      await client.auth.signOut({ scope: "local" });
      throw new HttpError(403, "Esta cuenta no tiene acceso al portal.");
    }
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    const response = errorResponse(error);
    Object.entries(privateHeaders).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  }
}
