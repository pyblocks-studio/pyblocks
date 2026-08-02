-- Run this migration in the Supabase SQL editor for the PyBlocks project.
create table if not exists public.pyblocks_projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 120),
    payload text not null check (char_length(payload) <= 8388608),
    encoding text not null check (encoding in ('gzip-base64', 'base64')),
    uncompressed_bytes integer not null check (
        uncompressed_bytes between 1 and 5242880
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, name)
);

alter table public.pyblocks_projects enable row level security;

create policy "Users can read their own PyBlocks projects"
on public.pyblocks_projects for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own PyBlocks projects"
on public.pyblocks_projects for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own PyBlocks projects"
on public.pyblocks_projects for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own PyBlocks projects"
on public.pyblocks_projects for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.pyblocks_projects from anon;
grant select, insert, update, delete on public.pyblocks_projects to authenticated;
