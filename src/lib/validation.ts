import { z } from "zod";

export const participantSchema = z.object({
  name: z.string().trim().min(2, "Escribí al menos 2 caracteres.").max(40, "Usá hasta 40 caracteres."),
  costume: z.string().trim().max(60, "Usá hasta 60 caracteres."),
  photoPath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/, "La foto no es válida."),
});
export const voteSchema = z.object({
  participantId: z.uuid(),
  stars: z.number().int().min(1).max(5),
});

export function pendingCostumes<T extends { id: string }>(costumes: T[], voted: string[], ownId?: string) {
  const excluded = new Set([...voted, ...(ownId ? [ownId] : [])]);
  return costumes.filter((costume) => !excluded.has(costume.id));
}
