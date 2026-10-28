export type Costume = { id: string; name: string; costume: string; photoUrl: string };
export type Participation = Costume;
export type QuestState = { participant: Participation | null; votes: number };
export type Stage = "home" | "upload" | "voting" | "thanks";
