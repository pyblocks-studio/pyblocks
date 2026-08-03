-- PyBlocks profiles, publishing, discovery, and activity statistics.
create table if not exists public.pyblocks_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    username text not null check (
        char_length(username) between 3 and 32
        and username ~ '^[A-Za-z0-9_]+$'
    ),
    role text not null default 'member' check (role in ('member', 'owner')),
    active_seconds bigint not null default 0 check (active_seconds >= 0),
    joined_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists pyblocks_profiles_username_lower_idx
on public.pyblocks_profiles (lower(username));

alter table public.pyblocks_profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.pyblocks_profiles;
create policy "Profiles are publicly readable"
on public.pyblocks_profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can create their own profile" on public.pyblocks_profiles;
create policy "Users can create their own profile"
on public.pyblocks_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id and role = 'member');

drop policy if exists "Users can update their own profile" on public.pyblocks_profiles;
create policy "Users can update their own profile"
on public.pyblocks_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.pyblocks_profiles from anon, authenticated;
grant select on public.pyblocks_profiles to anon, authenticated;
grant insert (user_id, username) on public.pyblocks_profiles to authenticated;
grant update (username, active_seconds, updated_at) on public.pyblocks_profiles to authenticated;

alter table public.pyblocks_projects
    add column if not exists description text not null default ''
        check (char_length(description) <= 500),
    add column if not exists is_published boolean not null default false,
    add column if not exists published_at timestamptz;

drop policy if exists "Published PyBlocks projects are publicly readable"
on public.pyblocks_projects;
create policy "Published PyBlocks projects are publicly readable"
on public.pyblocks_projects for select
to anon, authenticated
using (is_published);

grant select on public.pyblocks_projects to anon;

create or replace function public.record_pyblocks_activity(seconds integer)
returns void
language sql
security invoker
set search_path = ''
as $$
    update public.pyblocks_profiles
    set active_seconds = active_seconds + least(greatest(seconds, 0), 300),
        updated_at = now()
    where user_id = (select auth.uid());
$$;

revoke all on function public.record_pyblocks_activity(integer) from public, anon;
grant execute on function public.record_pyblocks_activity(integer) to authenticated;

insert into public.pyblocks_profiles (user_id, username, role, joined_at)
select id, 'goldL00X', 'owner', created_at
from auth.users
where lower(coalesce(raw_user_meta_data ->> 'username', '')) = 'goldl00x'
on conflict (user_id) do update
set username = excluded.username, role = 'owner';
