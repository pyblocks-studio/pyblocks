-- Durable attribution for remixed published projects.
alter table public.pyblocks_projects
    add column if not exists remixed_from_project_id uuid,
    add column if not exists remixed_from_name text,
    add column if not exists remixed_from_username text;

alter table public.pyblocks_projects
    drop constraint if exists pyblocks_projects_remix_attribution_check,
    add constraint pyblocks_projects_remix_attribution_check check (
        (
            remixed_from_project_id is null
            and remixed_from_name is null
            and remixed_from_username is null
        )
        or (
            remixed_from_project_id is not null
            and char_length(remixed_from_name) between 1 and 120
            and char_length(remixed_from_username) between 3 and 32
            and remixed_from_username ~ '^[A-Za-z0-9_]+$'
        )
    );

alter table public.pyblocks_project_revisions
    add column if not exists remixed_from_project_id uuid,
    add column if not exists remixed_from_name text,
    add column if not exists remixed_from_username text;

create or replace function private.archive_published_pyblocks_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if old.is_published and (
        tg_op = 'DELETE'
        or old.payload is distinct from new.payload
        or old.name is distinct from new.name
        or old.description is distinct from new.description
        or old.is_published is distinct from new.is_published
        or old.remixed_from_project_id is distinct from new.remixed_from_project_id
        or old.remixed_from_name is distinct from new.remixed_from_name
        or old.remixed_from_username is distinct from new.remixed_from_username
    ) then
        insert into public.pyblocks_project_revisions (
            project_id,
            user_id,
            name,
            description,
            payload,
            encoding,
            uncompressed_bytes,
            was_published,
            published_at,
            source_updated_at,
            archive_reason,
            remixed_from_project_id,
            remixed_from_name,
            remixed_from_username
        )
        values (
            old.id,
            old.user_id,
            old.name,
            old.description,
            old.payload,
            old.encoding,
            old.uncompressed_bytes,
            old.is_published,
            old.published_at,
            old.updated_at,
            case when tg_op = 'DELETE' then 'deleted' else 'updated' end,
            old.remixed_from_project_id,
            old.remixed_from_name,
            old.remixed_from_username
        );
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.archive_published_pyblocks_project()
from public, anon, authenticated;
