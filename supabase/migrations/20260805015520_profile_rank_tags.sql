-- Public rank tags assigned through the authenticated admin panel.
alter table public.pyblocks_profiles
    add column if not exists rank_tag text;

alter table public.pyblocks_profiles
    drop constraint if exists pyblocks_profiles_rank_tag_check,
    add constraint pyblocks_profiles_rank_tag_check
        check (
            rank_tag is null
            or (
                char_length(rank_tag) between 2 and 20
                and rank_tag = upper(rank_tag)
                and rank_tag ~ '^[A-Z0-9 _-]+$'
                and rank_tag not in ('OWNER', 'PYBLOCKS CREATOR')
            )
        );

create or replace function public.pyblocks_set_rank_tag(
    target_username text,
    new_rank_tag text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    cleaned_tag text;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;

    cleaned_tag := nullif(upper(trim(new_rank_tag)), '');
    if cleaned_tag in ('OWNER', 'PYBLOCKS CREATOR') then
        raise exception 'That permanent identity tag cannot be assigned';
    end if;

    update public.pyblocks_profiles
    set rank_tag = cleaned_tag,
        updated_at = now()
    where lower(username) = lower(trim(target_username))
      and not public.pyblocks_is_owner(user_id);
    return found;
end;
$$;

revoke all on function public.pyblocks_set_rank_tag(text, text)
from public, anon;
grant execute on function public.pyblocks_set_rank_tag(text, text)
to authenticated;

update public.pyblocks_profiles
set rank_tag = 'ADMIN'
where user_id in (select user_id from public.pyblocks_admins)
  and rank_tag is null
  and not public.pyblocks_is_owner(user_id);

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
    update public.pyblocks_profiles
    set rank_tag = coalesce(rank_tag, 'ADMIN'), updated_at = now()
    where user_id = target_id and not public.pyblocks_is_owner(target_id);
    return true;
end;
$$;

create or replace function public.pyblocks_revoke_admin(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare removed boolean;
begin
    if auth.uid() is null or not public.pyblocks_is_owner(auth.uid()) then
        raise exception 'Only the owner can revoke admin access';
    end if;
    delete from public.pyblocks_admins where user_id = target_id;
    removed := found;
    if removed then
        update public.pyblocks_profiles
        set rank_tag = null, updated_at = now()
        where user_id = target_id and rank_tag = 'ADMIN';
    end if;
    return removed;
end;
$$;

revoke all on function public.pyblocks_grant_admin(text),
    public.pyblocks_revoke_admin(uuid)
from public, anon;
grant execute on function public.pyblocks_grant_admin(text),
    public.pyblocks_revoke_admin(uuid)
to authenticated;
