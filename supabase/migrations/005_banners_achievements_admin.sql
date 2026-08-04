-- Banners, achievements, revocable admin access, and global announcements.
create table if not exists public.pyblocks_banners (
    id text primary key,
    name text not null unique,
    description text not null,
    sort_order integer not null default 0,
    is_public boolean not null default false
);

create table if not exists public.pyblocks_user_banners (
    user_id uuid not null references auth.users(id) on delete cascade,
    banner_id text not null references public.pyblocks_banners(id) on delete cascade,
    granted_by uuid references auth.users(id) on delete set null,
    granted_at timestamptz not null default now(),
    primary key (user_id, banner_id)
);

alter table public.pyblocks_profiles
    add column if not exists equipped_banner_id text
    references public.pyblocks_banners(id);

create table if not exists public.pyblocks_achievements (
    id text primary key,
    name text not null unique,
    description text not null,
    reward_banner_id text references public.pyblocks_banners(id),
    sort_order integer not null default 0
);

create table if not exists public.pyblocks_user_achievements (
    user_id uuid not null references auth.users(id) on delete cascade,
    achievement_id text not null references public.pyblocks_achievements(id) on delete cascade,
    earned_at timestamptz not null default now(),
    primary key (user_id, achievement_id)
);

create table if not exists public.pyblocks_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    granted_by uuid references auth.users(id) on delete set null,
    granted_at timestamptz not null default now()
);

create table if not exists public.pyblocks_announcements (
    id bigint generated always as identity primary key,
    message text not null check (char_length(message) between 1 and 500),
    author_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    active boolean not null default true
);

insert into public.pyblocks_banners (id, name, description, sort_order, is_public)
values
    ('default', 'DEFAULT', 'The original PyBlocks profile banner.', 10, true),
    ('pride', 'PRIDE', 'A joyful animated rainbow banner.', 20, true),
    ('vip', 'VIP', 'A golden banner with glowing shooting stars.', 30, false),
    ('circuitry', 'CIRCUITRY', 'Dark green circuits carrying bright electric pulses.', 40, false),
    ('dynamic', 'DYNAMIC', 'Expanding rings ripple across the banner.', 50, false)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_public = excluded.is_public;

insert into public.pyblocks_achievements (
    id, name, description, reward_banner_id, sort_order
)
values
    ('where_am_i', 'Where am I?', 'Create an account for PyBlocks.', null, 10),
    ('just_getting_started', 'Just Getting Started', 'Publish your first project on PyBlocks.', 'circuitry', 20),
    ('free_giveaway', 'Free Giveaway', 'Receive a gift from an admin.', 'dynamic', 30)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    reward_banner_id = excluded.reward_banner_id,
    sort_order = excluded.sort_order;

create or replace function public.pyblocks_is_owner(target uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.pyblocks_profiles p
        where p.user_id = target
          and (p.role = 'owner' or lower(p.username) = 'goldl00x')
    );
$$;

create or replace function public.pyblocks_is_admin(target uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.pyblocks_is_owner(target)
        or exists (
            select 1 from public.pyblocks_admins a where a.user_id = target
        );
$$;

create or replace function public.pyblocks_grant_banner(
    target_username text,
    target_banner text,
    audience text default 'user'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    affected integer := 0;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;
    if not exists (
        select 1 from public.pyblocks_banners where id = target_banner
    ) then
        raise exception 'Unknown banner';
    end if;

    if audience = 'all' then
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid() from public.pyblocks_profiles
        on conflict do nothing;
    elsif audience = 'active' then
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
        where updated_at > now() - interval '5 minutes'
        on conflict do nothing;
    else
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
        where lower(username) = lower(target_username)
        on conflict do nothing;
    end if;
    get diagnostics affected = row_count;
    return affected;
end;
$$;

create or replace function public.pyblocks_give_admin_gift(
    target_username text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;
    select user_id into target_id
    from public.pyblocks_profiles
    where lower(username) = lower(target_username);
    if target_id is null then return false; end if;
    insert into public.pyblocks_user_achievements (user_id, achievement_id)
    values (target_id, 'free_giveaway') on conflict do nothing;
    insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
    values (target_id, 'dynamic', auth.uid()) on conflict do nothing;
    return true;
end;
$$;

create or replace function public.pyblocks_grant_admin(target_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
    if auth.uid() is null or not public.pyblocks_is_owner(auth.uid()) then
        raise exception 'Only the owner can grant admin access';
    end if;
    select user_id into target_id from public.pyblocks_profiles
    where lower(username) = lower(target_username);
    if target_id is null then return false; end if;
    insert into public.pyblocks_admins (user_id, granted_by)
    values (target_id, auth.uid()) on conflict do nothing;
    return true;
end;
$$;

create or replace function public.pyblocks_revoke_admin(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null or not public.pyblocks_is_owner(auth.uid()) then
        raise exception 'Only the owner can revoke admin access';
    end if;
    delete from public.pyblocks_admins where user_id = target_id;
    return found;
end;
$$;

create or replace function private.pyblocks_award_account_achievement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.pyblocks_user_achievements (user_id, achievement_id)
    values (new.user_id, 'where_am_i') on conflict do nothing;
    insert into public.pyblocks_user_banners (user_id, banner_id)
    values (new.user_id, 'default'), (new.user_id, 'pride')
    on conflict do nothing;
    if new.role = 'owner' or lower(new.username) = 'goldl00x' then
        insert into public.pyblocks_user_banners (user_id, banner_id)
        values (new.user_id, 'vip') on conflict do nothing;
        update public.pyblocks_profiles
        set equipped_banner_id = coalesce(equipped_banner_id, 'vip')
        where user_id = new.user_id;
    end if;
    return new;
end;
$$;

create or replace function private.pyblocks_award_publish_achievement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if new.is_published then
        insert into public.pyblocks_user_achievements (user_id, achievement_id)
        values (new.user_id, 'just_getting_started') on conflict do nothing;
        insert into public.pyblocks_user_banners (user_id, banner_id)
        values (new.user_id, 'circuitry') on conflict do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists pyblocks_award_account on public.pyblocks_profiles;
create trigger pyblocks_award_account
after insert on public.pyblocks_profiles
for each row execute function private.pyblocks_award_account_achievement();

drop trigger if exists pyblocks_award_publish on public.pyblocks_projects;
create trigger pyblocks_award_publish
after insert or update of is_published on public.pyblocks_projects
for each row execute function private.pyblocks_award_publish_achievement();

insert into public.pyblocks_user_achievements (user_id, achievement_id)
select user_id, 'where_am_i' from public.pyblocks_profiles on conflict do nothing;
insert into public.pyblocks_user_banners (user_id, banner_id)
select user_id, banner_id
from public.pyblocks_profiles cross join (values ('default'), ('pride')) b(banner_id)
on conflict do nothing;
insert into public.pyblocks_user_achievements (user_id, achievement_id)
select distinct user_id, 'just_getting_started'
from public.pyblocks_projects where is_published on conflict do nothing;
insert into public.pyblocks_user_banners (user_id, banner_id)
select distinct user_id, 'circuitry'
from public.pyblocks_projects where is_published on conflict do nothing;
insert into public.pyblocks_user_banners (user_id, banner_id)
select user_id, 'vip' from public.pyblocks_profiles
where role = 'owner' or lower(username) = 'goldl00x' on conflict do nothing;
update public.pyblocks_profiles set equipped_banner_id = 'vip'
where (role = 'owner' or lower(username) = 'goldl00x')
  and equipped_banner_id is null;

alter table public.pyblocks_banners enable row level security;
alter table public.pyblocks_user_banners enable row level security;
alter table public.pyblocks_achievements enable row level security;
alter table public.pyblocks_user_achievements enable row level security;
alter table public.pyblocks_admins enable row level security;
alter table public.pyblocks_announcements enable row level security;

create policy "Banners are public" on public.pyblocks_banners
for select to anon, authenticated using (true);
create policy "Achievements are public" on public.pyblocks_achievements
for select to anon, authenticated using (true);
create policy "Earned banners are public" on public.pyblocks_user_banners
for select to anon, authenticated using (true);
create policy "Earned achievements are public" on public.pyblocks_user_achievements
for select to anon, authenticated using (true);
create policy "Users equip owned banners" on public.pyblocks_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
    (select auth.uid()) = user_id
    and (
        equipped_banner_id is null
        or exists (
            select 1 from public.pyblocks_user_banners ub
            where ub.user_id = (select auth.uid())
              and ub.banner_id = equipped_banner_id
        )
    )
);
create policy "Admins can see admin list" on public.pyblocks_admins
for select to authenticated using (public.pyblocks_is_admin(auth.uid()));
create policy "Announcements are public" on public.pyblocks_announcements
for select to anon, authenticated using (active);
create policy "Admins create announcements" on public.pyblocks_announcements
for insert to authenticated
with check (
    public.pyblocks_is_admin(auth.uid())
    and author_id = (select auth.uid())
);
create policy "Admins retire announcements" on public.pyblocks_announcements
for update to authenticated
using (public.pyblocks_is_admin(auth.uid()))
with check (public.pyblocks_is_admin(auth.uid()));

revoke all on public.pyblocks_banners, public.pyblocks_user_banners,
    public.pyblocks_achievements, public.pyblocks_user_achievements,
    public.pyblocks_admins, public.pyblocks_announcements
from anon, authenticated;
grant select on public.pyblocks_banners, public.pyblocks_user_banners,
    public.pyblocks_achievements, public.pyblocks_user_achievements
to anon, authenticated;
grant select on public.pyblocks_admins to authenticated;
grant select on public.pyblocks_announcements to anon, authenticated;
grant insert, update on public.pyblocks_announcements to authenticated;
grant update (equipped_banner_id) on public.pyblocks_profiles to authenticated;

revoke all on function public.pyblocks_is_owner(uuid),
    public.pyblocks_is_admin(uuid),
    public.pyblocks_grant_banner(text, text, text),
    public.pyblocks_give_admin_gift(text),
    public.pyblocks_grant_admin(text),
    public.pyblocks_revoke_admin(uuid)
from public, anon;
grant execute on function public.pyblocks_is_owner(uuid),
    public.pyblocks_is_admin(uuid),
    public.pyblocks_grant_banner(text, text, text),
    public.pyblocks_give_admin_gift(text),
    public.pyblocks_grant_admin(text),
    public.pyblocks_revoke_admin(uuid)
to authenticated;
revoke all on function private.pyblocks_award_account_achievement(),
    private.pyblocks_award_publish_achievement()
from public, anon, authenticated;
