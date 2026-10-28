begin;

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  costume text not null default '' check (char_length(costume) <= 60),
  photo_path text not null unique,
  created_at timestamptz not null default now()
);
create table public.votes (
  voter_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (voter_id, participant_id)
);
create index votes_participant_idx on public.votes(participant_id);

alter table public.participants enable row level security;
alter table public.votes enable row level security;
revoke all on public.participants, public.votes from anon, authenticated;
grant select on public.participants, public.votes to authenticated;
create policy "Read own participation" on public.participants for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Read own votes" on public.votes for select to authenticated
  using (voter_id = (select auth.uid()));

create function public.create_participant(p_name text, p_costume text, p_photo_path text)
returns table(id uuid, name text, costume text, photo_path text)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise insufficient_privilege; end if;
  if char_length(btrim(p_name)) not between 2 and 40 or char_length(p_costume) > 60 then
    raise exception 'Invalid participant';
  end if;
  -- Stable retries return the already registered entry without changing it.
  if exists (select 1 from public.participants p where p.owner_id = v_user) then
    return query select p.id, p.name, p.costume, p.photo_path from public.participants p where p.owner_id = v_user;
    return;
  end if;
  if p_photo_path !~ ('^' || v_user::text || '/[0-9a-f-]{36}\.jpg$') or
    not exists (select 1 from storage.objects o where o.bucket_id = 'costumes' and o.name = p_photo_path) then
    raise exception 'Invalid photo';
  end if;
  insert into public.participants as p (owner_id, name, costume, photo_path)
    values (v_user, btrim(p_name), btrim(p_costume), p_photo_path)
    on conflict (owner_id) do nothing;
  return query select p.id, p.name, p.costume, p.photo_path from public.participants p where p.owner_id = v_user;
end;
$$;

create function public.list_costumes()
returns table(id uuid, name text, costume text, photo_path text)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.participants p where p.owner_id = v_user) then
    raise insufficient_privilege;
  end if;
  return query select p.id, p.name, p.costume, p.photo_path from public.participants p
    where p.owner_id <> v_user
      and not exists (select 1 from public.votes v where v.voter_id = v_user and v.participant_id = p.id)
    order by md5(p.id::text || v_user::text) limit 200;
end;
$$;

create function public.cast_vote(p_participant_id uuid, p_stars integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.participants p where p.owner_id = v_user) then
    raise insufficient_privilege;
  end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Invalid stars'; end if;
  if not exists (select 1 from public.participants p where p.id = p_participant_id and p.owner_id <> v_user) then
    raise exception 'Invalid costume';
  end if;
  -- The unique key also prevents duplicate votes from retries and parallel requests.
  insert into public.votes (voter_id, participant_id, stars) values (v_user, p_participant_id, p_stars)
    on conflict (voter_id, participant_id) do nothing;
end;
$$;

revoke all on function public.create_participant(text, text, text) from public, anon;
revoke all on function public.list_costumes() from public, anon;
revoke all on function public.cast_vote(uuid, integer) from public, anon;
grant execute on function public.create_participant(text, text, text) to authenticated;
grant execute on function public.list_costumes() to authenticated;
grant execute on function public.cast_vote(uuid, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('costumes', 'costumes', true, 3145728, array['image/jpeg']);

create policy "Upload own costume" on storage.objects for insert to authenticated
  with check (bucket_id = 'costumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and not exists (select 1 from public.participants p where p.owner_id = (select auth.uid())));
create policy "Read own upload metadata" on storage.objects for select to authenticated
  using (bucket_id = 'costumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Clean up unused own photo" on storage.objects for delete to authenticated
  using (bucket_id = 'costumes' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.participants p where p.photo_path = storage.objects.name));

commit;
