import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!configured) throw new Error("Falta conectar Supabase. Revisá las variables de .env.local.");
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}

let signingIn: Promise<string> | null = null;
export async function getAccessToken(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.access_token;
  signingIn ??= (async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw new Error("No pudimos iniciar tu sesión. Revisá tu conexión e intentá de nuevo.");
    return data.session.access_token;
  })().finally(() => { signingIn = null; });
  return signingIn;
}

export function photoUrl(path: string) {
  return getSupabase().storage.from("costumes").getPublicUrl(path).data.publicUrl;
}
