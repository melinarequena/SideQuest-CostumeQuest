import { NextResponse } from "next/server";
import { voteSchema } from "@/lib/validation";
import { authenticatedClient, checkBodySize, errorResponse, HttpError } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkBodySize(request);
    const { client } = await authenticatedClient(request);
    const parsed = voteSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, "Elegí entre 1 y 5 estrellas.");
    const { error } = await client.rpc("cast_vote", { p_participant_id: parsed.data.participantId, p_stars: parsed.data.stars });
    if (error) throw new HttpError(400, "No pudimos registrar ese voto. Recargá e intentá de nuevo.");
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
