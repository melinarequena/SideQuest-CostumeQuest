export type RankedCostume = { id: string; name: string; photoPath: string; totalStars: number; votes: number; place: number | null };
export type Dashboard = { votingEnabled: boolean; participants: number; votes: number; totalStars: number; ranking: RankedCostume[] };
