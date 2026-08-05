-- Safe SVG avatars, admin achievement grants, and complete owner collections.
update storage.buckets
set allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
]
where id = 'pyblocks-avatars';

create or replace function private.pyblocks_sync_owner_collection(
    target_user uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.pyblocks_is_owner(target_user) then return; end if;

    insert into public.pyblocks_user_achievements (user_id, achievement_id)
    select target_user, achievement.id
    from public.pyblocks_achievements achievement
    on conflict do nothing;

    insert into public.pyblocks_user_banners (user_id, banner_id)
    select target_user, banner.id
    from public.pyblocks_banners banner
    on conflict do nothing;
end;
$$;

create or replace function private.pyblocks_sync_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform private.pyblocks_sync_owner_collection(new.user_id);
    return new;
end;
$$;

drop trigger if exists pyblocks_sync_owner_profile
on public.pyblocks_profiles;
create trigger pyblocks_sync_owner_profile
after insert or update of role, username
on public.pyblocks_profiles
for each row execute function private.pyblocks_sync_owner_profile();

create or replace function private.pyblocks_sync_all_owner_collections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    owner_record record;
begin
    for owner_record in
        select user_id
        from public.pyblocks_profiles
        where role = 'owner' or lower(username) = 'goldl00x'
    loop
        perform private.pyblocks_sync_owner_collection(owner_record.user_id);
    end loop;
    return null;
end;
$$;

drop trigger if exists pyblocks_sync_owners_after_banner
on public.pyblocks_banners;
create trigger pyblocks_sync_owners_after_banner
after insert on public.pyblocks_banners
for each statement execute function private.pyblocks_sync_all_owner_collections();

drop trigger if exists pyblocks_sync_owners_after_achievement
on public.pyblocks_achievements;
create trigger pyblocks_sync_owners_after_achievement
after insert on public.pyblocks_achievements
for each statement execute function private.pyblocks_sync_all_owner_collections();

create or replace function public.pyblocks_grant_achievement(
    target_username text,
    target_achievement text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    target_id uuid;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;

    select profile.user_id into target_id
    from public.pyblocks_profiles profile
    where lower(profile.username) = lower(target_username);

    if target_id is null or not exists (
        select 1
        from public.pyblocks_achievements achievement
        where achievement.id = target_achievement
    ) then
        return false;
    end if;

    perform private.pyblocks_award_achievement(
        target_id,
        target_achievement
    );
    return true;
end;
$$;

revoke all on function
    private.pyblocks_sync_owner_collection(uuid),
    private.pyblocks_sync_owner_profile(),
    private.pyblocks_sync_all_owner_collections()
from public, anon, authenticated;

revoke all on function
    public.pyblocks_grant_achievement(text, text)
from public, anon;

grant execute on function
    public.pyblocks_grant_achievement(text, text)
to authenticated;

do $$
declare
    owner_record record;
begin
    for owner_record in
        select user_id
        from public.pyblocks_profiles
        where role = 'owner' or lower(username) = 'goldl00x'
    loop
        perform private.pyblocks_sync_owner_collection(owner_record.user_id);
    end loop;
end
$$;
