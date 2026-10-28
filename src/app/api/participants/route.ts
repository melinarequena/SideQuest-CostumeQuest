import { NextResponse } from "next/server";
import { participantSchema } from "@/lib/validation";
import { authenticatedClient, checkBodySize, errorResponse, HttpError } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkBodySize(request);
    const { client, user } = await authenticatedClient(request);
    const parsed = participantSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    if (!parsed.data.photoPath.startsWith(`${user.id}/`)) throw new HttpError(403, "La foto no pertenece a tu sesión.");
    const { data, error } = await client.rpc("create_participant", { p_name: parsed.data.name, p_costume: parsed.data.costume, p_photo_path: parsed.data.photoPath });
    if (error || !data?.[0]) throw new HttpError(400, "No pudimos registrar el disfraz. Revisá los datos e intentá de nuevo.");
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) { return errorResponse(error); }
}
