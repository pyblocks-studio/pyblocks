-- Expanded banners, automatic achievements, and owner-only banner grants.
alter table public.pyblocks_banners
    add column if not exists grant_level text not null default 'admin'
    check (grant_level in ('public', 'admin', 'owner', 'automatic'));

insert into public.pyblocks_banners (
    id, name, description, sort_order, is_public, grant_level
)
values
    ('default', 'DEFAULT', 'The original PyBlocks profile banner.', 10, true, 'public'),
    ('pride', 'PRIDE', 'A joyful animated rainbow banner.', 20, true, 'public'),
    ('vip', 'VIP', 'A golden banner with glowing shooting stars.', 30, false, 'admin'),
    ('circuitry', 'CIRCUITRY', 'Dark green circuits carrying bright electric pulses.', 40, false, 'automatic'),
    ('dynamic', 'DYNAMIC', 'Expanding rings ripple across the banner.', 50, false, 'admin'),
    ('og', 'OG', 'Navy parallax gears for members who joined in August or September 2026.', 60, false, 'automatic'),
    ('uwu', 'UWU', 'A dreamy parade of floating uwu cats.', 70, false, 'owner'),
    ('nyan', 'NYAN CAT', 'The legendary rainbow-trailing pixel cat.', 80, false, 'owner'),
    ('hacker', 'HACKER', 'Streaming terminal text for the most determined creators.', 90, false, 'automatic'),
    ('blueprint', 'BLUEPRINT', 'A precise technical grid for prolific builders.', 100, false, 'automatic'),
    ('glitch', 'GLITCH', 'Chromatic digital interference for dedicated remixers.', 110, false, 'automatic'),
    ('orbit', 'ORBIT', 'Layered particles circling through deep space.', 120, false, 'automatic'),
    ('echo', 'ECHO', 'Teal waves celebrating projects that inspire more projects.', 130, false, 'automatic')
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_public = excluded.is_public,
    grant_level = excluded.grant_level;

insert into public.pyblocks_achievements (
    id, name, description, reward_banner_id, sort_order
)
values
    ('determined_1', 'DETERMINED I', 'Spend 1 hour actively creating with PyBlocks.', null, 100),
    ('determined_2', 'DETERMINED II', 'Spend 5 hours actively creating with PyBlocks.', null, 110),
    ('determined_3', 'DETERMINED III', 'Spend 10 hours actively creating with PyBlocks.', null, 120),
    ('determined_4', 'DETERMINED IV', 'Spend 20 hours actively creating with PyBlocks.', null, 130),
    ('determined_5', 'DETERMINED V', 'Spend 50 hours actively creating with PyBlocks.', 'hacker', 140),
    ('og_status', 'OG STATUS', 'Join PyBlocks during August or September 2026.', 'og', 200),
    ('double_feature', 'DOUBLE FEATURE', 'Publish 2 projects on PyBlocks.', null, 210),
    ('high_five', 'HIGH FIVE', 'Publish 5 projects on PyBlocks.', 'blueprint', 220),
    ('perfect_ten', 'PERFECT TEN', 'Publish 10 projects on PyBlocks.', 'orbit', 230),
    ('remix_rookie', 'REMIX ROOKIE', 'Publish your first remix.', null, 240),
    ('remix_regular', 'REMIX REGULAR', 'Publish 5 remixed projects.', 'glitch', 250),
    ('original_spark', 'ORIGINAL SPARK', 'Have one of your original projects remixed.', null, 260),
    ('ripple_effect', 'RIPPLE EFFECT', 'Inspire 5 published remixes of your projects.', 'echo', 270),
    ('project_keeper', 'PROJECT KEEPER', 'Save 10 projects to your PyBlocks account.', null, 280),
    ('one_month_later', 'ONE MONTH LATER', 'Return after your account is 30 days old.', null, 290)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    reward_banner_id = excluded.reward_banner_id,
    sort_order = excluded.sort_order;

create or replace function private.pyblocks_award_achievement(
    target_user uuid,
    target_achievement text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.pyblocks_user_achievements (user_id, achievement_id)
    select target_user, a.id
    from public.pyblocks_achievements a
    where a.id = target_achievement
    on conflict do nothing;

    insert into public.pyblocks_user_banners (user_id, banner_id)
    select target_user, a.reward_banner_id
    from public.pyblocks_achievements a
    where a.id = target_achievement
      and a.reward_banner_id is not null
    on conflict do nothing;
end;
$$;

create or replace function private.pyblocks_sync_user_achievements(
    target_user uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_record public.pyblocks_profiles%rowtype;
    project_count integer;
    published_count integer;
    remix_count integer;
    inspired_count integer;
begin
    select * into profile_record
    from public.pyblocks_profiles
    where user_id = target_user;
    if not found then return; end if;

    select
        count(*),
        count(*) filter (where is_published),
        count(*) filter (
            where is_published and remixed_from_project_id is not null
        )
    into project_count, published_count, remix_count
    from public.pyblocks_projects
    where user_id = target_user;

    select count(*) into inspired_count
    from public.pyblocks_projects remix
    join public.pyblocks_projects original
      on original.id = remix.remixed_from_project_id
    where original.user_id = target_user
      and remix.user_id <> target_user
      and remix.is_published;

    if profile_record.active_seconds >= 3600 then
        perform private.pyblocks_award_achievement(target_user, 'determined_1');
    end if;
    if profile_record.active_seconds >= 18000 then
        perform private.pyblocks_award_achievement(target_user, 'determined_2');
    end if;
    if profile_record.active_seconds >= 36000 then
        perform private.pyblocks_award_achievement(target_user, 'determined_3');
    end if;
    if profile_record.active_seconds >= 72000 then
        perform private.pyblocks_award_achievement(target_user, 'determined_4');
    end if;
    if profile_record.active_seconds >= 180000 then
        perform private.pyblocks_award_achievement(target_user, 'determined_5');
    end if;
    if profile_record.joined_at >= timestamptz '2026-08-01 00:00:00+00'
       and profile_record.joined_at < timestamptz '2026-10-01 00:00:00+00' then
        perform private.pyblocks_award_achievement(target_user, 'og_status');
    end if;
    if published_count >= 2 then
        perform private.pyblocks_award_achievement(target_user, 'double_feature');
    end if;
    if published_count >= 5 then
        perform private.pyblocks_award_achievement(target_user, 'high_five');
    end if;
    if published_count >= 10 then
        perform private.pyblocks_award_achievement(target_user, 'perfect_ten');
    end if;
    if remix_count >= 1 then
        perform private.pyblocks_award_achievement(target_user, 'remix_rookie');
    end if;
    if remix_count >= 5 then
        perform private.pyblocks_award_achievement(target_user, 'remix_regular');
    end if;
    if inspired_count >= 1 then
        perform private.pyblocks_award_achievement(target_user, 'original_spark');
    end if;
    if inspired_count >= 5 then
        perform private.pyblocks_award_achievement(target_user, 'ripple_effect');
    end if;
    if project_count >= 10 then
        perform private.pyblocks_award_achievement(target_user, 'project_keeper');
    end if;
    if profile_record.joined_at <= now() - interval '30 days' then
        perform private.pyblocks_award_achievement(target_user, 'one_month_later');
    end if;
end;
$$;

create or replace function private.pyblocks_sync_profile_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform private.pyblocks_sync_user_achievements(new.user_id);
    return new;
end;
$$;

create or replace function private.pyblocks_sync_project_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    original_owner uuid;
begin
    perform private.pyblocks_sync_user_achievements(new.user_id);
    if new.remixed_from_project_id is not null then
        select user_id into original_owner
        from public.pyblocks_projects
        where id = new.remixed_from_project_id;
        if original_owner is not null then
            perform private.pyblocks_sync_user_achievements(original_owner);
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists pyblocks_sync_profile_achievements
on public.pyblocks_profiles;
create trigger pyblocks_sync_profile_achievements
after insert or update of active_seconds on public.pyblocks_profiles
for each row execute function private.pyblocks_sync_profile_achievements();

drop trigger if exists pyblocks_sync_project_achievements
on public.pyblocks_projects;
create trigger pyblocks_sync_project_achievements
after insert or update of is_published, remixed_from_project_id
on public.pyblocks_projects
for each row execute function private.pyblocks_sync_project_achievements();

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
    required_level text;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;
    select grant_level into required_level
    from public.pyblocks_banners
    where id = target_banner;
    if required_level is null then raise exception 'Unknown banner'; end if;
    if required_level = 'automatic' then
        raise exception 'This banner is awarded automatically';
    end if;
    if required_level = 'owner'
       and not public.pyblocks_is_owner(auth.uid()) then
        raise exception 'Only the owner can grant this banner';
    end if;

    if audience = 'all' then
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
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

revoke all on function private.pyblocks_award_achievement(uuid, text),
    private.pyblocks_sync_user_achievements(uuid),
    private.pyblocks_sync_profile_achievements(),
    private.pyblocks_sync_project_achievements()
from public, anon, authenticated;

grant select (grant_level) on public.pyblocks_banners to anon, authenticated;

do $$
declare profile_row record;
begin
    for profile_row in select user_id from public.pyblocks_profiles loop
        perform private.pyblocks_sync_user_achievements(profile_row.user_id);
    end loop;
end;
$$;
