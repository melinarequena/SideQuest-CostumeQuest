begin;

-- No client can grant itself administration or write the event settings directly.
create table public.quest_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.quest_settings (
  id smallint primary key check (id = 1),
  voting_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.quest_settings (id, voting_enabled) values (1, false);
alter table public.quest_admins enable row level security;
alter table public.quest_settings enable row level security;
revoke all on public.quest_admins, public.quest_settings from public, anon, authenticated;

create function public.is_quest_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.quest_admins where user_id = (select auth.uid()));
$$;

create function public.get_voting_status()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select voting_enabled from public.quest_settings where id = 1), false);
$$;

create function public.set_voting_enabled(p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_quest_admin() then raise insufficient_privilege; end if;
  if p_enabled is null then raise exception 'Missing voting state'; end if;
  update public.quest_settings set voting_enabled = p_enabled, updated_at = now(), updated_by = auth.uid() where id = 1;
  return p_enabled;
end;
$$;

create function public.quest_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_quest_admin() then raise insufficient_privilege; end if;
  with scores as (
    select p.id, p.name, p.photo_path, p.created_at,
      coalesce(sum(v.stars), 0)::bigint as total_stars, count(v.voter_id) as vote_count
    from public.participants p left join public.votes v on v.participant_id = p.id
    group by p.id
  ), ranked as (
    select *, case when total_stars > 0 then dense_rank() over (order by total_stars desc) else null end as place
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
    ) order by total_stars desc, created_at, id) from ranked), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.list_costumes()
returns table(id uuid, name text, costume text, photo_path text)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise insufficient_privilege; end if;
  if not public.get_voting_status() then raise exception using errcode = '55000', message = 'Voting is closed'; end if;
  return query select p.id, p.name, p.costume, p.photo_path from public.participants p
    where p.owner_id <> v_user
      and not exists (select 1 from public.votes v where v.voter_id = v_user and v.participant_id = p.id)
    order by md5(p.id::text || v_user::text) limit 200;
end;
$$;

create or replace function public.cast_vote(p_participant_id uuid, p_stars integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_enabled boolean;
begin
  if v_user is null then raise insufficient_privilege; end if;
  -- Share the settings row lock with other voters. Closing waits for votes already
  -- in flight; after the close commits, even previously loaded cards cannot vote.
  select voting_enabled into v_enabled from public.quest_settings where id = 1 for share;
  if not coalesce(v_enabled, false) then raise exception using errcode = '55000', message = 'Voting is closed'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Invalid stars'; end if;
  if not exists (select 1 from public.participants p where p.id = p_participant_id and p.owner_id <> v_user) then
    raise exception 'Invalid costume';
  end if;
  insert into public.votes (voter_id, participant_id, stars) values (v_user, p_participant_id, p_stars)
    on conflict (voter_id, participant_id) do nothing;
end;
$$;

revoke all on function public.is_quest_admin(), public.get_voting_status(), public.set_voting_enabled(boolean), public.quest_dashboard() from public, anon, authenticated;
grant execute on function public.get_voting_status() to anon, authenticated;
grant execute on function public.is_quest_admin(), public.set_voting_enabled(boolean), public.quest_dashboard() to authenticated;
revoke all on function public.list_costumes(), public.cast_vote(uuid, integer) from public, anon;
grant execute on function public.list_costumes(), public.cast_vote(uuid, integer) to authenticated;

commit;
