-- Targeted admin banner revocation and bulk management.
create or replace function public.pyblocks_revoke_banner(
    target_username text,
    target_banner text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    target_id uuid;
    required_level text;
    affected integer := 0;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;

    select user_id into target_id
    from public.pyblocks_profiles
    where lower(username) = lower(target_username);
    if target_id is null then return 0; end if;

    select grant_level into required_level
    from public.pyblocks_banners
    where id = target_banner;
    if required_level is null then raise exception 'Unknown banner'; end if;
    if required_level = 'automatic' then
        raise exception 'Achievement banners cannot be manually revoked';
    end if;
    if required_level = 'owner'
       and not public.pyblocks_is_owner(auth.uid()) then
        raise exception 'Only the owner can revoke this banner';
    end if;

    update public.pyblocks_profiles
    set equipped_banner_id = null
    where user_id = target_id
      and equipped_banner_id = target_banner;

    delete from public.pyblocks_user_banners
    where user_id = target_id
      and banner_id = target_banner;
    get diagnostics affected = row_count;
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
    where b.grant_level <> 'automatic'
      and (caller_is_owner or b.grant_level <> 'owner')
    on conflict do nothing;
    get diagnostics affected = row_count;
    return affected;
end;
$$;

create or replace function public.pyblocks_revoke_all_banners(
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

    update public.pyblocks_profiles p
    set equipped_banner_id = null
    where p.user_id = target_id
      and exists (
          select 1
          from public.pyblocks_banners b
          where b.id = p.equipped_banner_id
            and b.grant_level <> 'automatic'
            and (caller_is_owner or b.grant_level <> 'owner')
      );

    delete from public.pyblocks_user_banners ub
    using public.pyblocks_banners b
    where ub.user_id = target_id
      and b.id = ub.banner_id
      and b.grant_level <> 'automatic'
      and (caller_is_owner or b.grant_level <> 'owner');
    get diagnostics affected = row_count;
    return affected;
end;
$$;

revoke all on function public.pyblocks_revoke_banner(text, text),
    public.pyblocks_grant_all_banners(text),
    public.pyblocks_revoke_all_banners(text)
from public, anon;

grant execute on function public.pyblocks_revoke_banner(text, text),
    public.pyblocks_grant_all_banners(text),
    public.pyblocks_revoke_all_banners(text)
to authenticated;
