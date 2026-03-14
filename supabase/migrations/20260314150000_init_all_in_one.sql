-- Single-run init migration (merged from phase2~phase10).
-- Safe to run on a fresh database. Existing objects are generally guarded with IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.


-- ===== BEGIN 20260313190000_phase2_init.sql =====

-- Phase 2: Schema + Supabase base policies
-- Product: 今日顺顺 (non-medical)

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shape_type') then
    create type public.shape_type as enum ('dry', 'normal', 'loose');
  end if;

  if not exists (select 1 from pg_type where typname = 'feeling_type') then
    create type public.feeling_type as enum ('smooth', 'normal', 'hard', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'friend_relation_status') then
    create type public.friend_relation_status as enum ('pending', 'active', 'removed');
  end if;

  if not exists (select 1 from pg_type where typname = 'interaction_type') then
    create type public.interaction_type as enum ('cheer', 'clap', 'heart', 'drink_water');
  end if;

  if not exists (select 1 from pg_type where typname = 'interaction_status') then
    create type public.interaction_status as enum ('sent', 'read');
  end if;

  if not exists (select 1 from pg_type where typname = 'reminder_style') then
    create type public.reminder_style as enum ('gentle', 'cute');
  end if;

  if not exists (select 1 from pg_type where typname = 'friend_invite_status') then
    create type public.friend_invite_status as enum ('pending', 'accepted', 'expired', 'cancelled');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_nickname_len check (nickname is null or char_length(nickname) <= 50)
);

create table if not exists public.poop_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_time timestamptz not null default now(),
  record_date date not null default current_date,
  shape_type public.shape_type,
  feeling_type public.feeling_type,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint poop_records_note_len check (note is null or char_length(note) <= 300)
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reminder_enabled boolean not null default false,
  reminder_time time,
  reminder_style public.reminder_style not null default 'gentle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  status public.friend_relation_status not null default 'pending',
  initiator_user_id uuid not null references auth.users(id) on delete cascade,
  invite_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  removed_at timestamptz,
  constraint friend_relations_not_self check (user_id <> friend_user_id)
);

create table if not exists public.friend_share_settings (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.friend_relations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  share_has_record boolean not null default true,
  share_record_time boolean not null default false,
  share_shape boolean not null default false,
  share_note boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friend_share_settings
  drop constraint if exists friend_share_settings_relation_id_key;

create table if not exists public.friend_interactions (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.friend_relations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  receiver_user_id uuid not null references auth.users(id) on delete cascade,
  target_record_id uuid references public.poop_records(id) on delete set null,
  interaction_type public.interaction_type not null,
  status public.interaction_status not null default 'sent',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint friend_interactions_not_self check (sender_user_id <> receiver_user_id)
);

create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  status public.friend_invite_status not null default 'pending',
  expires_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);

create index if not exists idx_poop_records_user_time
  on public.poop_records(user_id, record_time desc)
  where deleted_at is null;
create index if not exists idx_poop_records_user_date
  on public.poop_records(user_id, record_date desc)
  where deleted_at is null;

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

create index if not exists idx_friend_relations_user on public.friend_relations(user_id);
create index if not exists idx_friend_relations_friend on public.friend_relations(friend_user_id);
create unique index if not exists ux_friend_relations_active_per_user
  on public.friend_relations(user_id)
  where status = 'active' and removed_at is null;
create unique index if not exists ux_friend_relations_active_pair
  on public.friend_relations (
    least(user_id, friend_user_id),
    greatest(user_id, friend_user_id)
  )
  where status = 'active' and removed_at is null;

create index if not exists idx_friend_share_settings_owner on public.friend_share_settings(owner_user_id);
create unique index if not exists ux_friend_share_settings_relation_owner
  on public.friend_share_settings(relation_id, owner_user_id);
create index if not exists idx_friend_interactions_receiver_status
  on public.friend_interactions(receiver_user_id, status, created_at desc);
create index if not exists idx_friend_invites_inviter_status
  on public.friend_invites(inviter_user_id, status, created_at desc);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_poop_records_updated_at on public.poop_records;
create trigger trg_poop_records_updated_at
before update on public.poop_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_friend_relations_updated_at on public.friend_relations;
create trigger trg_friend_relations_updated_at
before update on public.friend_relations
for each row execute function public.set_updated_at();

drop trigger if exists trg_friend_share_settings_updated_at on public.friend_share_settings;
create trigger trg_friend_share_settings_updated_at
before update on public.friend_share_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_friend_invites_updated_at on public.friend_invites;
create trigger trg_friend_invites_updated_at
before update on public.friend_invites
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.poop_records enable row level security;
alter table public.user_settings enable row level security;
alter table public.friend_relations enable row level security;
alter table public.friend_share_settings enable row level security;
alter table public.friend_interactions enable row level security;
alter table public.friend_invites enable row level security;

drop policy if exists "user_profiles_owner_all" on public.user_profiles;
create policy "user_profiles_owner_all"
on public.user_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "poop_records_owner_all" on public.poop_records;
create policy "poop_records_owner_all"
on public.poop_records
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner_all" on public.user_settings;
create policy "user_settings_owner_all"
on public.user_settings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "friend_relations_members_select" on public.friend_relations;
create policy "friend_relations_members_select"
on public.friend_relations
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_user_id);

drop policy if exists "friend_relations_insert_member" on public.friend_relations;
create policy "friend_relations_insert_member"
on public.friend_relations
for insert
to authenticated
with check (
  auth.uid() = initiator_user_id
  and (auth.uid() = user_id or auth.uid() = friend_user_id)
  and user_id <> friend_user_id
);

drop policy if exists "friend_relations_update_member" on public.friend_relations;
create policy "friend_relations_update_member"
on public.friend_relations
for update
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_user_id)
with check (auth.uid() = user_id or auth.uid() = friend_user_id);

drop policy if exists "friend_relations_delete_member" on public.friend_relations;
create policy "friend_relations_delete_member"
on public.friend_relations
for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_user_id);

drop policy if exists "friend_share_settings_member_select" on public.friend_share_settings;
create policy "friend_share_settings_member_select"
on public.friend_share_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
  )
);

drop policy if exists "friend_share_settings_owner_write" on public.friend_share_settings;
create policy "friend_share_settings_owner_write"
on public.friend_share_settings
for all
to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and (fr.user_id = owner_user_id or fr.friend_user_id = owner_user_id)
  )
)
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and (fr.user_id = owner_user_id or fr.friend_user_id = owner_user_id)
  )
);

drop policy if exists "friend_interactions_member_select" on public.friend_interactions;
create policy "friend_interactions_member_select"
on public.friend_interactions
for select
to authenticated
using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());

drop policy if exists "friend_interactions_sender_insert" on public.friend_interactions;
create policy "friend_interactions_sender_insert"
on public.friend_interactions
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and (fr.user_id = sender_user_id or fr.friend_user_id = sender_user_id)
      and (fr.user_id = receiver_user_id or fr.friend_user_id = receiver_user_id)
  )
);

drop policy if exists "friend_interactions_receiver_update" on public.friend_interactions;
create policy "friend_interactions_receiver_update"
on public.friend_interactions
for update
to authenticated
using (receiver_user_id = auth.uid())
with check (receiver_user_id = auth.uid());

drop policy if exists "friend_invites_owner_select" on public.friend_invites;
create policy "friend_invites_owner_select"
on public.friend_invites
for select
to authenticated
using (inviter_user_id = auth.uid() or accepted_by_user_id = auth.uid());

drop policy if exists "friend_invites_owner_insert" on public.friend_invites;
create policy "friend_invites_owner_insert"
on public.friend_invites
for insert
to authenticated
with check (inviter_user_id = auth.uid());

drop policy if exists "friend_invites_owner_update" on public.friend_invites;
create policy "friend_invites_owner_update"
on public.friend_invites
for update
to authenticated
using (inviter_user_id = auth.uid() or accepted_by_user_id = auth.uid())
with check (inviter_user_id = auth.uid() or accepted_by_user_id = auth.uid());

drop policy if exists "friend_invites_owner_delete" on public.friend_invites;
create policy "friend_invites_owner_delete"
on public.friend_invites
for delete
to authenticated
using (inviter_user_id = auth.uid());


-- ===== END 20260313190000_phase2_init.sql =====


-- ===== BEGIN 20260313210000_phase6_friend_constraints.sql =====

-- Phase 6: enforce single active friend relation per user at DB level

create or replace function public.enforce_single_active_friend_relation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and new.removed_at is null then
    if exists (
      select 1
      from public.friend_relations fr
      where fr.id <> new.id
        and fr.status = 'active'
        and fr.removed_at is null
        and (
          new.user_id in (fr.user_id, fr.friend_user_id)
          or new.friend_user_id in (fr.user_id, fr.friend_user_id)
        )
    ) then
      raise exception 'Each user can have only one active friend relation at a time';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_single_active_friend_relation on public.friend_relations;
create trigger trg_enforce_single_active_friend_relation
before insert or update on public.friend_relations
for each row execute function public.enforce_single_active_friend_relation();

-- ===== END 20260313210000_phase6_friend_constraints.sql =====


-- ===== BEGIN 20260313223000_fix_friend_invite_accept_rls.sql =====

-- Phase 8 hotfix: allow authenticated users to accept pending invite codes safely.
-- Root cause:
-- 1) Existing SELECT policy only allowed inviter/accepted_by to read invites.
-- 2) Existing UPDATE policy only allowed inviter/accepted_by to update invites.
-- This made "accept invite by code" impossible for the receiver before acceptance.

create or replace function public.enforce_friend_invites_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  -- Prevent changing immutable identity fields after creation.
  if old.inviter_user_id <> new.inviter_user_id then
    raise exception 'inviter_user_id is immutable';
  end if;

  if old.invite_code <> new.invite_code then
    raise exception 'invite_code is immutable';
  end if;

  if old.created_at <> new.created_at then
    raise exception 'created_at is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_friend_invites_immutable_fields on public.friend_invites;
create trigger trg_friend_invites_immutable_fields
before update on public.friend_invites
for each row execute function public.enforce_friend_invites_immutable_fields();

drop policy if exists "friend_invites_owner_select" on public.friend_invites;
drop policy if exists "friend_invites_select_or_lookup_pending" on public.friend_invites;
create policy "friend_invites_select_or_lookup_pending"
on public.friend_invites
for select
to authenticated
using (
  inviter_user_id = auth.uid()
  or accepted_by_user_id = auth.uid()
  or (status = 'pending' and accepted_by_user_id is null)
);

drop policy if exists "friend_invites_owner_update" on public.friend_invites;
drop policy if exists "friend_invites_inviter_or_accept_pending_update" on public.friend_invites;
create policy "friend_invites_inviter_or_accept_pending_update"
on public.friend_invites
for update
to authenticated
using (
  inviter_user_id = auth.uid()
  or accepted_by_user_id = auth.uid()
  or (status = 'pending' and accepted_by_user_id is null)
)
with check (
  inviter_user_id = auth.uid()
  or (accepted_by_user_id = auth.uid() and status = 'accepted')
);

-- ===== END 20260313223000_fix_friend_invite_accept_rls.sql =====


-- ===== BEGIN 20260313232000_phase7_friend_visibility_rpc_hotfix.sql =====

-- Phase 7 hotfix: ensure friend visibility RPC exists in DB with a unique migration version.
-- Reason: previous files shared the same timestamp prefix and may not both be applied.

create or replace function public.get_friend_visible_summary(
  p_relation_id uuid,
  p_date date
)
returns table (
  has_record boolean,
  record_time timestamptz,
  shape_type public.shape_type,
  note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_relation public.friend_relations%rowtype;
  v_owner uuid;
  v_setting public.friend_share_settings%rowtype;
  v_record public.poop_records%rowtype;
begin
  if v_viewer is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_relation
  from public.friend_relations
  where id = p_relation_id
    and status = 'active'
    and removed_at is null;

  if not found then
    raise exception 'relation not found or inactive';
  end if;

  if v_viewer <> v_relation.user_id and v_viewer <> v_relation.friend_user_id then
    raise exception 'forbidden';
  end if;

  v_owner := case
    when v_viewer = v_relation.user_id then v_relation.friend_user_id
    else v_relation.user_id
  end;

  select *
  into v_setting
  from public.friend_share_settings
  where relation_id = p_relation_id
    and owner_user_id = v_owner;

  if not found then
    insert into public.friend_share_settings (
      relation_id,
      owner_user_id,
      share_has_record,
      share_record_time,
      share_shape,
      share_note
    ) values (
      p_relation_id,
      v_owner,
      true,
      false,
      false,
      false
    )
    returning * into v_setting;
  end if;

  select *
  into v_record
  from public.poop_records
  where user_id = v_owner
    and record_date = p_date
    and deleted_at is null
  order by record_time desc
  limit 1;

  if not found then
    return query
    select false, null::timestamptz, null::public.shape_type, null::text;
    return;
  end if;

  return query
  select
    true,
    case when v_setting.share_record_time then v_record.record_time else null::timestamptz end,
    case when v_setting.share_shape then v_record.shape_type else null::public.shape_type end,
    case when v_setting.share_note then v_record.note else null::text end;
end;
$$;

grant execute on function public.get_friend_visible_summary(uuid, date) to authenticated;

-- ===== END 20260313232000_phase7_friend_visibility_rpc_hotfix.sql =====


-- ===== BEGIN 20260314090000_phase9_timer_aliases.sql =====

-- Phase 9: timer session fields + friend aliases (incremental)

alter table public.poop_records
  add column if not exists session_started_at timestamptz,
  add column if not exists session_ended_at timestamptz,
  add column if not exists duration_seconds integer;

alter table public.user_profiles
  add column if not exists nickname text;

create table if not exists public.friend_aliases (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.friend_relations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  alias_name varchar(32) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_aliases_not_self check (owner_user_id <> target_user_id)
);

create unique index if not exists ux_friend_aliases_owner_target
  on public.friend_aliases(relation_id, owner_user_id, target_user_id);

create index if not exists idx_friend_aliases_owner
  on public.friend_aliases(owner_user_id, updated_at desc);

create index if not exists idx_friend_aliases_relation
  on public.friend_aliases(relation_id);

create index if not exists idx_poop_records_session_start
  on public.poop_records(user_id, session_started_at desc)
  where deleted_at is null and session_started_at is not null;

alter table public.friend_aliases enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_friend_aliases_updated_at'
  ) then
    create trigger trg_friend_aliases_updated_at
    before update on public.friend_aliases
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_aliases'
      and policyname = 'friend_aliases_owner_select'
  ) then
    execute $policy$
      create policy "friend_aliases_owner_select"
      on public.friend_aliases
      for select
      to authenticated
      using (
        owner_user_id = auth.uid()
        and exists (
          select 1
          from public.friend_relations fr
          where fr.id = relation_id
            and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
            and (fr.user_id = target_user_id or fr.friend_user_id = target_user_id)
        )
      )
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_aliases'
      and policyname = 'friend_aliases_owner_insert'
  ) then
    execute $policy$
      create policy "friend_aliases_owner_insert"
      on public.friend_aliases
      for insert
      to authenticated
      with check (
        owner_user_id = auth.uid()
        and exists (
          select 1
          from public.friend_relations fr
          where fr.id = relation_id
            and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
            and (fr.user_id = target_user_id or fr.friend_user_id = target_user_id)
        )
      )
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_aliases'
      and policyname = 'friend_aliases_owner_update'
  ) then
    execute $policy$
      create policy "friend_aliases_owner_update"
      on public.friend_aliases
      for update
      to authenticated
      using (owner_user_id = auth.uid())
      with check (owner_user_id = auth.uid())
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_aliases'
      and policyname = 'friend_aliases_owner_delete'
  ) then
    execute $policy$
      create policy "friend_aliases_owner_delete"
      on public.friend_aliases
      for delete
      to authenticated
      using (owner_user_id = auth.uid())
    $policy$;
  end if;
end $$;

-- ===== END 20260314090000_phase9_timer_aliases.sql =====


-- ===== BEGIN 20260314102000_phase9_peer_profile_rpc_and_alias_policy_hardening.sql =====

-- Phase 9 hotfix:
-- 1) Expose peer profile nickname via relation-scoped RPC (RLS-safe).
-- 2) Harden friend_aliases update/delete policies to require active relation membership.

create table if not exists public.friend_aliases (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.friend_relations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  alias_name varchar(32) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_aliases_not_self check (owner_user_id <> target_user_id)
);

create unique index if not exists ux_friend_aliases_owner_target
  on public.friend_aliases(relation_id, owner_user_id, target_user_id);

alter table public.friend_aliases enable row level security;

create or replace function public.get_relation_peer_profile(
  p_relation_id uuid
)
returns table (
  user_id uuid,
  nickname text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_relation public.friend_relations%rowtype;
  v_peer_id uuid;
begin
  if v_viewer is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_relation
  from public.friend_relations
  where id = p_relation_id
    and status = 'active'
    and removed_at is null;

  if not found then
    raise exception 'relation not found or inactive';
  end if;

  if v_viewer <> v_relation.user_id and v_viewer <> v_relation.friend_user_id then
    raise exception 'forbidden';
  end if;

  v_peer_id := case
    when v_viewer = v_relation.user_id then v_relation.friend_user_id
    else v_relation.user_id
  end;

  return query
  select up.user_id, up.nickname
  from public.user_profiles up
  where up.user_id = v_peer_id
  limit 1;
end;
$$;

grant execute on function public.get_relation_peer_profile(uuid) to authenticated;

drop policy if exists "friend_aliases_owner_update" on public.friend_aliases;
create policy "friend_aliases_owner_update"
on public.friend_aliases
for update
to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and fr.status = 'active'
      and fr.removed_at is null
      and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
      and (fr.user_id = target_user_id or fr.friend_user_id = target_user_id)
  )
)
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and fr.status = 'active'
      and fr.removed_at is null
      and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
      and (fr.user_id = target_user_id or fr.friend_user_id = target_user_id)
  )
);

drop policy if exists "friend_aliases_owner_delete" on public.friend_aliases;
create policy "friend_aliases_owner_delete"
on public.friend_aliases
for delete
to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.friend_relations fr
    where fr.id = relation_id
      and fr.status = 'active'
      and fr.removed_at is null
      and (fr.user_id = auth.uid() or fr.friend_user_id = auth.uid())
      and (fr.user_id = target_user_id or fr.friend_user_id = target_user_id)
  )
);

-- ===== END 20260314102000_phase9_peer_profile_rpc_and_alias_policy_hardening.sql =====


-- ===== BEGIN 20260314120000_phase10_daily_statuses.sql =====

-- Phase 10: lightweight daily status for skip/no-poop/quiet days

create table if not exists public.daily_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status_date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_statuses_status_check check (status in ('no_poop', 'skip', 'quiet'))
);

create unique index if not exists ux_daily_statuses_user_date
  on public.daily_statuses(user_id, status_date);

create index if not exists idx_daily_statuses_user_month
  on public.daily_statuses(user_id, status_date desc);

alter table public.daily_statuses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_daily_statuses_updated_at'
  ) then
    create trigger trg_daily_statuses_updated_at
    before update on public.daily_statuses
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_statuses'
      and policyname = 'daily_statuses_owner_all'
  ) then
    execute $policy$
      create policy "daily_statuses_owner_all"
      on public.daily_statuses
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

-- ===== END 20260314120000_phase10_daily_statuses.sql =====

-- ===== CONSISTENCY HARDENING: poop_records <-> daily_statuses mutual exclusion =====
-- Rule:
-- 1) A user/date cannot have both an active poop record and a daily status.
-- 2) When creating/updating an active poop record, same-day daily status is auto-cleared.

create or replace function public.guard_daily_status_conflict()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.poop_records pr
    where pr.user_id = new.user_id
      and pr.record_date = new.status_date
      and pr.deleted_at is null
  ) then
    raise exception 'daily status conflicts with existing poop record on the same date';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_daily_statuses_guard_conflict on public.daily_statuses;
create trigger trg_daily_statuses_guard_conflict
before insert or update on public.daily_statuses
for each row execute function public.guard_daily_status_conflict();

create or replace function public.sync_clear_daily_status_on_poop_record()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is null then
    delete from public.daily_statuses ds
    where ds.user_id = new.user_id
      and ds.status_date = new.record_date;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_poop_records_clear_daily_status on public.poop_records;
create trigger trg_poop_records_clear_daily_status
before insert or update on public.poop_records
for each row execute function public.sync_clear_daily_status_on_poop_record();


-- Cleanup deprecated policy from older experiments (if present).
drop policy if exists "user_profiles_friend_read" on public.user_profiles;


