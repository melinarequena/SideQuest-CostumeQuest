begin;

-- Equal scores occupy consecutive places; a podium has at most three winners.
create or replace function public.quest_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_quest_admin() then raise insufficient_privilege; end if;
  with scores as (
    select p.id, p.name, p.photo_path,
      coalesce(sum(v.stars), 0)::bigint as total_stars, count(v.voter_id) as vote_count
    from public.participants p left join public.votes v on v.participant_id = p.id
    group by p.id
  ), ranked as (
    select *, case when total_stars > 0 then row_number() over (order by total_stars desc, id) else null end as place
    from scores
  )
  select jsonb_build_object(
    'votingEnabled', public.get_voting_status(),
    'participants', (select count(*) from public.participants),
    'votes', (select count(*) from public.votes),
    'totalStars', (select coalesce(sum(stars), 0) from public.votes),
    'ranking', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'photoPath', photo_path, 'totalStars', total_stars,
      'votes', vote_count, 'place', place
    ) order by total_stars desc, id) from ranked), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.quest_dashboard() from public, anon;
grant execute on function public.quest_dashboard() to authenticated;

commit;
