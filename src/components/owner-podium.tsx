import { Star } from "lucide-react";
import type { Dashboard, RankedCostume } from "@/lib/admin-types";

function imageUrl(entry: RankedCostume) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/costumes/${entry.photoPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function OwnerPodium({ dashboard }: { dashboard: Dashboard }) {
  return <>
    <section className="owner-results" aria-labelledby="podium-heading">
      <div className="owner-section-heading"><h2 id="podium-heading">GANADORES<span className="red">.</span></h2><span>{dashboard.votingEnabled ? "Resultados en vivo · provisorios" : "Resultados actuales"}</span></div>
      {!dashboard.ranking.some((entry) => entry.place !== null) ? <div className="owner-empty">El podio aparece con los primeros votos.</div> : <div className="owner-podium">{[1, 2, 3].map((place) => <div key={place} className={`podium-place place-${place}`}>
        <span className="podium-number">{place}<small>°</small></span>
        {dashboard.ranking.filter((entry) => entry.place === place).map((entry) => <article key={entry.id} className="podium-card"><img src={imageUrl(entry)} alt={`Disfraz de ${entry.name}`} /><div><h3>{entry.name}</h3><strong><Star size={15} fill="currentColor" /> {entry.totalStars} estrellas</strong><span>{entry.votes} {entry.votes === 1 ? "voto" : "votos"}</span></div></article>)}
        {!dashboard.ranking.some((entry) => entry.place === place) && <p className="podium-pending">Sin votos todavía</p>}
      </div>)}</div>}
      <p className="owner-ranking-rule">Por total de estrellas. Los empates comparten puesto.</p>
    </section>
    <section className="owner-ranking" aria-labelledby="ranking-heading"><h2 id="ranking-heading">TODOS LOS DISFRACES</h2>
      {dashboard.ranking.length === 0 ? <p className="owner-empty">Todavía no se subieron fotos.</p> : <div className="owner-table-wrap"><table><thead><tr><th scope="col">Puesto</th><th scope="col">Participante</th><th scope="col">Votos</th><th scope="col">Estrellas</th></tr></thead><tbody>{dashboard.ranking.map((entry) => <tr key={entry.id}><td>{entry.place === null ? "—" : `${entry.place}°`}</td><th scope="row"><img src={imageUrl(entry)} alt="" width={40} height={48} />{entry.name}</th><td>{entry.votes}</td><td><strong>{entry.totalStars}</strong></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
