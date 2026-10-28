import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { HttpError } from "./server";
import { isAdminOrigin } from "./admin-origin";

export const privateHeaders = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", "Expires": "0", "Pragma": "no-cache", "Vary": "Cookie" };

// Admin credentials stay in server-only HttpOnly cookies, separate from guests'
// anonymous browser session. This module must only be imported by route handlers.
export async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new HttpError(503, "El portal todavía no está configurado.");
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      name: "sq-owner", httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/api/admin", maxAge: 60 * 60 * 12,
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => { updates.forEach(({ name, value, options }) => store.set(name, value, options)); },
    },
  });
}

export async function requireAdmin() {
  const client = await adminClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new HttpError(401, "Ingresá tu contraseña para acceder.");
  const permission = await client.rpc("is_quest_admin");
  if (permission.error || permission.data !== true) throw new HttpError(403, "Esta cuenta no tiene acceso al portal.");
  return client;
}

export async function clearAdminCookies() {
  const store = await cookies();
  store.getAll().filter(({ name }) => name === "sq-owner" || name.startsWith("sq-owner.") || name.startsWith("sq-owner-")).forEach(({ name }) => {
    store.set(name, "", { path: "/api/admin", maxAge: 0, httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  });
}

export function checkAdminOrigin(request: Request) {
  // Next's internal URL may use localhost while the browser uses 127.0.0.1.
  // Compare with the actual request Host, without trusting forwarded host headers.
  if (!isAdminOrigin(request)) {
    throw new HttpError(403, "La solicitud no pertenece a este portal.");
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Formato no admitido.");
}
