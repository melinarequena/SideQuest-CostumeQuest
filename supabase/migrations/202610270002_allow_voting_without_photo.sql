begin;

-- Voting uses the anonymous session; owning a costume is optional.
create or replace function public.list_costumes()
returns table(id uuid, name text, costume text, photo_path text)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise insufficient_privilege; end if;
  return query select p.id, p.name, p.costume, p.photo_path from public.participants p
    where p.owner_id <> v_user
      and not exists (select 1 from public.votes v where v.voter_id = v_user and v.participant_id = p.id)
    order by md5(p.id::text || v_user::text) limit 200;
end;
$$;

create or replace function public.cast_vote(p_participant_id uuid, p_stars integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise insufficient_privilege; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Invalid stars'; end if;
  if not exists (select 1 from public.participants p where p.id = p_participant_id and p.owner_id <> v_user) then
    raise exception 'Invalid costume';
  end if;
  insert into public.votes (voter_id, participant_id, stars) values (v_user, p_participant_id, p_stars)
    on conflict (voter_id, participant_id) do nothing;
end;
$$;

revoke all on function public.list_costumes() from public, anon;
revoke all on function public.cast_vote(uuid, integer) from public, anon;
grant execute on function public.list_costumes() to authenticated;
grant execute on function public.cast_vote(uuid, integer) to authenticated;

commit;
