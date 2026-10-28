-- Ejecutar en SQL Editor (solo organización). No expone resultados a los invitados.
select p.name, p.costume,
  count(v.stars) as cantidad_votos,
  round(avg(v.stars)::numeric, 2) as promedio_estrellas,
  coalesce(sum(v.stars), 0) as total_estrellas
from public.participants p
left join public.votes v on v.participant_id = p.id
group by p.id
order by total_estrellas desc, p.created_at;
