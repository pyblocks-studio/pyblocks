-- Achievement reward banners can be gifted and unlock their achievements.
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
    caller_is_owner boolean;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;
    caller_is_owner := public.pyblocks_is_owner(auth.uid());

    select grant_level into required_level
    from public.pyblocks_banners
    where id = target_banner;
    if required_level is null then raise exception 'Unknown banner'; end if;
    if required_level = 'owner' and not caller_is_owner then
        raise exception 'Only the owner can grant this banner';
    end if;

    if audience = 'all' then
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
        on conflict do nothing;

        insert into public.pyblocks_user_achievements (
            user_id, achievement_id
        )
        select p.user_id, a.id
        from public.pyblocks_profiles p
        join public.pyblocks_achievements a
          on a.reward_banner_id = target_banner
        on conflict do nothing;

        select count(*) into affected
        from public.pyblocks_profiles;
    elsif audience = 'active' then
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
        where updated_at > now() - interval '5 minutes'
        on conflict do nothing;

        insert into public.pyblocks_user_achievements (
            user_id, achievement_id
        )
        select p.user_id, a.id
        from public.pyblocks_profiles p
        join public.pyblocks_achievements a
          on a.reward_banner_id = target_banner
        where p.updated_at > now() - interval '5 minutes'
        on conflict do nothing;

        select count(*) into affected
        from public.pyblocks_profiles
        where updated_at > now() - interval '5 minutes';
    else
        insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
        select user_id, target_banner, auth.uid()
        from public.pyblocks_profiles
        where lower(username) = lower(target_username)
        on conflict do nothing;

        insert into public.pyblocks_user_achievements (
            user_id, achievement_id
        )
        select p.user_id, a.id
        from public.pyblocks_profiles p
        join public.pyblocks_achievements a
          on a.reward_banner_id = target_banner
        where lower(p.username) = lower(target_username)
        on conflict do nothing;

        select count(*) into affected
        from public.pyblocks_profiles
        where lower(username) = lower(target_username);
    end if;
    return affected;
end;
$$;

create or replace function public.pyblocks_grant_all_banners(
    target_username text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    target_id uuid;
    caller_is_owner boolean;
    affected integer := 0;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;
    caller_is_owner := public.pyblocks_is_owner(auth.uid());

    select user_id into target_id
    from public.pyblocks_profiles
    where lower(username) = lower(target_username);
    if target_id is null then return 0; end if;

    insert into public.pyblocks_user_banners (user_id, banner_id, granted_by)
    select target_id, b.id, auth.uid()
    from public.pyblocks_banners b
    where caller_is_owner or b.grant_level <> 'owner'
    on conflict do nothing;

    insert into public.pyblocks_user_achievements (user_id, achievement_id)
    select target_id, a.id
    from public.pyblocks_achievements a
    join public.pyblocks_banners b
      on b.id = a.reward_banner_id
    where caller_is_owner or b.grant_level <> 'owner'
    on conflict do nothing;

    select count(*) into affected
    from public.pyblocks_banners b
    where caller_is_owner or b.grant_level <> 'owner';
    return affected;
end;
$$;
