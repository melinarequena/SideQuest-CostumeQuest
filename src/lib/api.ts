import { getAccessToken, getSupabase, photoUrl } from "./supabase";
import type { Costume, Participation, QuestState } from "./types";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`/api/${path}`, {
    ...options, cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Algo salió mal. Intentá de nuevo.");
  return data;
}
type Row = { id: string; name: string; costume: string; photo_path: string };
function mapCostume(row: Row): Costume { return { id: row.id, name: row.name, costume: row.costume, photoUrl: photoUrl(row.photo_path) }; }

export async function fetchState(): Promise<QuestState> {
  const result = await api<{ participant: Row | null; votes: number }>("me");
  return { participant: result.participant ? mapCostume(result.participant) : null, votes: result.votes };
}
export async function fetchCostumes() { return (await api<Row[]>("costumes")).map(mapCostume); }
export async function submitParticipant(name: string, costume: string, photo: Blob): Promise<Participation> {
  await getAccessToken();
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Se perdió tu sesión. Recargá la página.");
  const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("costumes").upload(path, photo, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
  if (error) throw new Error("No pudimos subir la foto. Revisá tu conexión e intentá de nuevo.");
  try {
    const result = await api<Row>("participants", { method: "POST", body: JSON.stringify({ name, costume, photoPath: path }) });
    if (result.photo_path !== path) await supabase.storage.from("costumes").remove([path]);
    return mapCostume(result);
  } catch (error) {
    // The DELETE policy preserves a photo if a timed-out request already registered it.
    await supabase.storage.from("costumes").remove([path]);
    throw error;
  }
}
export async function submitVote(participantId: string, stars: number) {
  await api("votes", { method: "POST", body: JSON.stringify({ participantId, stars }) });
}
