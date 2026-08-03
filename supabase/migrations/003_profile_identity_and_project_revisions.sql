-- Public profile identity, secure avatar uploads, and durable published revisions.
alter table public.pyblocks_profiles
    add column if not exists display_name text,
    add column if not exists avatar_path text;

update public.pyblocks_profiles
set display_name = username
where display_name is null;

alter table public.pyblocks_profiles
    alter column display_name set not null;

alter table public.pyblocks_profiles
    drop constraint if exists pyblocks_profiles_display_name_check,
    add constraint pyblocks_profiles_display_name_check
        check (char_length(display_name) between 1 and 40),
    drop constraint if exists pyblocks_profiles_avatar_path_check,
    add constraint pyblocks_profiles_avatar_path_check
        check (
            avatar_path is null
            or avatar_path = user_id::text || '/avatar'
        );

revoke all on public.pyblocks_profiles from anon, authenticated;
grant select on public.pyblocks_profiles to anon, authenticated;
grant insert (user_id, username, display_name) on public.pyblocks_profiles
to authenticated;
grant update (display_name, avatar_path, active_seconds, updated_at)
on public.pyblocks_profiles to authenticated;

drop policy if exists "Published PyBlocks projects are publicly readable"
on public.pyblocks_projects;
create policy "Published PyBlocks projects are publicly readable"
on public.pyblocks_projects for select
to anon
using (is_published);

drop policy if exists "Users can read their own PyBlocks projects"
on public.pyblocks_projects;
create policy "Users can read available PyBlocks projects"
on public.pyblocks_projects for select
to authenticated
using ((select auth.uid()) = user_id or is_published);

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'pyblocks-avatars',
    'pyblocks-avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can insert their own PyBlocks avatar"
on storage.objects;
create policy "Users can insert their own PyBlocks avatar"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'pyblocks-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name = (select auth.uid())::text || '/avatar'
);

drop policy if exists "Users can read their own PyBlocks avatar metadata"
on storage.objects;
create policy "Users can read their own PyBlocks avatar metadata"
on storage.objects for select
to authenticated
using (
    bucket_id = 'pyblocks-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own PyBlocks avatar"
on storage.objects;
create policy "Users can update their own PyBlocks avatar"
on storage.objects for update
to authenticated
using (
    bucket_id = 'pyblocks-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
    bucket_id = 'pyblocks-avatars'
    and name = (select auth.uid())::text || '/avatar'
);

drop policy if exists "Users can delete their own PyBlocks avatar"
on storage.objects;
create policy "Users can delete their own PyBlocks avatar"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'pyblocks-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

create table if not exists public.pyblocks_project_revisions (
    revision_id bigint generated always as identity primary key,
    project_id uuid not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text not null,
    payload text not null,
    encoding text not null,
    uncompressed_bytes integer not null,
    was_published boolean not null,
    published_at timestamptz,
    source_updated_at timestamptz not null,
    archived_at timestamptz not null default now(),
    archive_reason text not null check (
        archive_reason in ('updated', 'deleted')
    )
);

create index if not exists pyblocks_project_revisions_owner_idx
on public.pyblocks_project_revisions (user_id, project_id, archived_at desc);

alter table public.pyblocks_project_revisions enable row level security;

drop policy if exists "Users can read their own project revisions"
on public.pyblocks_project_revisions;
create policy "Users can read their own project revisions"
on public.pyblocks_project_revisions for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.pyblocks_project_revisions from anon, authenticated;
grant select on public.pyblocks_project_revisions to authenticated;

create schema if not exists private;

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
            archive_reason
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
            case when tg_op = 'DELETE' then 'deleted' else 'updated' end
        );
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.archive_published_pyblocks_project()
from public, anon, authenticated;

do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        execute
            'revoke all on function public.rls_auto_enable() '
            'from public, anon, authenticated';
    end if;
end;
$$;

drop trigger if exists archive_published_pyblocks_project
on public.pyblocks_projects;
create trigger archive_published_pyblocks_project
before update or delete on public.pyblocks_projects
for each row execute function private.archive_published_pyblocks_project();
