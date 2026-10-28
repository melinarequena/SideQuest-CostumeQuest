import { NextResponse } from "next/server";
import { authenticatedClient, errorResponse } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const { client, user } = await authenticatedClient(request);
    const [participant, votes] = await Promise.all([
      client.from("participants").select("id,name,costume,photo_path").eq("owner_id", user.id).maybeSingle(),
      client.from("votes").select("participant_id", { count: "exact", head: true }).eq("voter_id", user.id),
    ]);
    if (participant.error || votes.error) throw new Error("Could not restore participation");
    return NextResponse.json({ participant: participant.data, votes: votes.count || 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
