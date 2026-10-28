import type { Costume, QuestState } from "./types";
import { pendingCostumes } from "./validation";

const key = "costume-quest-demo-v1";
type DemoData = QuestState & { voted: string[] };
const examples: Costume[] = [
  { id: "demo-ghost", name: "Alex", costume: "El invitado que nadie esperaba", photoUrl: "/demo/ghost.svg" },
  { id: "demo-pumpkin", name: "Juli", costume: "La reina de las calabazas", photoUrl: "/demo/pumpkin.svg" },
  { id: "demo-vampire", name: "Fran", costume: "Un vampiro con mucho estilo", photoUrl: "/demo/vampire.svg" },
];

function read(): DemoData {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value && Array.isArray(value.voted)) return value;
  } catch { /* A fresh demo remains usable if previous storage is malformed. */ }
  return { participant: null, votes: 0, voted: [] };
}
function write(value: DemoData) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("No pudimos guardar la demo. Liberá espacio o permití el almacenamiento del navegador."); }
}
export function demoState(): QuestState { return read(); }
export async function demoUpload(name: string, costume: string, photo: Blob) {
  const data = read();
  if (data.participant) return data.participant;
  const photoUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No pudimos guardar la foto de prueba."));
    reader.readAsDataURL(photo);
  });
  const participant = { id: "demo-me", name, costume, photoUrl };
  write({ ...data, participant });
  return participant;
}
export function demoCostumes() { const data = read(); return pendingCostumes(examples, data.voted, data.participant?.id); }
export function demoVote(id: string) {
  const data = read();
  if (!data.voted.includes(id)) write({ ...data, votes: data.votes + 1, voted: [...data.voted, id] });
}
