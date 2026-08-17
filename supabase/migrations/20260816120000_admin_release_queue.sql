-- Admin-managed release queue and realtime site commands.
create table if not exists public.pyblocks_updates (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 100),
    description text not null default '' check (char_length(description) <= 1000),
    version text not null default '' check (char_length(version) <= 40),
    status text not null default 'queued' check (status in ('queued', 'live')),
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    activated_at timestamptz
);

create index if not exists pyblocks_updates_status_created_idx
on public.pyblocks_updates (status, created_at desc);

create table if not exists public.pyblocks_site_commands (
    id uuid primary key default gen_random_uuid(),
    command text not null check (command in ('reload')),
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists pyblocks_site_commands_created_idx
on public.pyblocks_site_commands (created_at desc);

alter table public.pyblocks_updates enable row level security;
alter table public.pyblocks_site_commands enable row level security;

create policy "Live updates are public and admins see the queue"
on public.pyblocks_updates for select to anon, authenticated
using (status = 'live' or (select public.pyblocks_is_admin((select auth.uid()))));

create policy "Admins queue updates"
on public.pyblocks_updates for insert to authenticated
with check (
    created_by = (select auth.uid())
    and status = 'queued'
    and (select public.pyblocks_is_admin((select auth.uid())))
);

create policy "Admins activate updates"
on public.pyblocks_updates for update to authenticated
using ((select public.pyblocks_is_admin((select auth.uid()))))
with check (
    (select public.pyblocks_is_admin((select auth.uid())))
    and status in ('queued', 'live')
);

create policy "Everyone can receive site commands"
on public.pyblocks_site_commands for select to anon, authenticated
using (true);

create policy "Admins issue site commands"
on public.pyblocks_site_commands for insert to authenticated
with check (
    created_by = (select auth.uid())
    and (select public.pyblocks_is_admin((select auth.uid())))
);

revoke all on public.pyblocks_updates, public.pyblocks_site_commands from anon, authenticated;
grant select on public.pyblocks_updates, public.pyblocks_site_commands to anon, authenticated;
grant insert, update on public.pyblocks_updates to authenticated;
grant insert on public.pyblocks_site_commands to authenticated;

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'pyblocks_updates'
    ) then
        alter publication supabase_realtime add table public.pyblocks_updates;
    end if;
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'pyblocks_site_commands'
    ) then
        alter publication supabase_realtime add table public.pyblocks_site_commands;
    end if;
end
$$;
