-- Giveable profile titles and the protected @PyBlocks official identity.
alter table public.pyblocks_profiles
    drop constraint if exists pyblocks_profiles_rank_tag_check;

alter table public.pyblocks_profiles
    add constraint pyblocks_profiles_rank_tag_check
    check (
        rank_tag is null
        or (
            rank_tag = 'PYBLOCKS OFFICIAL ACCOUNT'
            and lower(username) = 'pyblocks'
        )
        or (
            char_length(rank_tag) between 2 and 32
            and rank_tag = upper(rank_tag)
            and rank_tag ~ '^[A-Z0-9 _-]+$'
            and rank_tag not in (
                'OWNER',
                'PYBLOCKS CREATOR',
                'PYBLOCKS OFFICIAL ACCOUNT'
            )
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
    target_id uuid;
    stored_username text;
begin
    if auth.uid() is null or not public.pyblocks_is_admin(auth.uid()) then
        raise exception 'Admin access required';
    end if;

    select user_id, username
    into target_id, stored_username
    from public.pyblocks_profiles
    where lower(username) = lower(trim(target_username))
    limit 1;

    if target_id is null then
        return false;
    end if;
    if public.pyblocks_is_owner(target_id) then
        raise exception 'The owner identity is permanent';
    end if;

    cleaned_tag := nullif(upper(trim(new_rank_tag)), '');
    if lower(stored_username) = 'pyblocks' then
        if cleaned_tag is distinct from 'PYBLOCKS OFFICIAL ACCOUNT' then
            raise exception 'The PyBlocks official account title is permanent';
        end if;
    elsif cleaned_tag = 'PYBLOCKS OFFICIAL ACCOUNT' then
        raise exception 'Only @PyBlocks can use that title';
    end if;
    if cleaned_tag in ('OWNER', 'PYBLOCKS CREATOR') then
        raise exception 'That permanent identity title cannot be assigned';
    end if;

    update public.pyblocks_profiles
    set rank_tag = cleaned_tag,
        updated_at = now()
    where user_id = target_id;
    return found;
end;
$$;

revoke all on function public.pyblocks_set_rank_tag(text, text)
from public, anon;
grant execute on function public.pyblocks_set_rank_tag(text, text)
to authenticated;

update public.pyblocks_profiles
set rank_tag = 'PYBLOCKS OFFICIAL ACCOUNT',
    updated_at = now()
where lower(username) = 'pyblocks';
