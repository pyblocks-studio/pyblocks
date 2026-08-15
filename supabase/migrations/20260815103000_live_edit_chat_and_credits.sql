-- Persistent Live Edit chat, host room controls, and public collaborator credits.
create table if not exists public.pyblocks_live_chat_messages (
    id uuid primary key default gen_random_uuid(),
    lobby_id uuid not null references public.pyblocks_live_lobbies(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    body text not null check (char_length(body) between 1 and 1000),
    created_at timestamptz not null default now()
);

create index if not exists pyblocks_live_chat_lobby_idx
on public.pyblocks_live_chat_messages (lobby_id, created_at asc);
create index if not exists pyblocks_live_chat_sender_idx
on public.pyblocks_live_chat_messages (sender_id);

create table if not exists public.pyblocks_project_contributors (
    project_id uuid not null references public.pyblocks_projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    contributed_at timestamptz not null default now(),
    primary key (project_id, user_id)
);

create index if not exists pyblocks_project_contributors_user_idx
on public.pyblocks_project_contributors (user_id);

create or replace function private.pyblocks_record_live_contributor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    shared_project uuid;
    project_owner uuid;
begin
    select lobby.project_id, lobby.owner_id
    into shared_project, project_owner
    from public.pyblocks_live_lobbies lobby
    where lobby.id = new.lobby_id;

    if shared_project is not null and new.user_id <> project_owner then
        insert into public.pyblocks_project_contributors (project_id, user_id)
        values (shared_project, new.user_id)
        on conflict (project_id, user_id) do nothing;
    end if;
    return new;
end;
$$;

revoke all on function private.pyblocks_record_live_contributor()
from public, anon, authenticated;
drop trigger if exists pyblocks_record_live_contributor
on public.pyblocks_live_lobby_members;
create trigger pyblocks_record_live_contributor
after insert on public.pyblocks_live_lobby_members
for each row execute function private.pyblocks_record_live_contributor();

alter table public.pyblocks_live_chat_messages enable row level security;
alter table public.pyblocks_project_contributors enable row level security;

create policy "Lobby members can read chat"
on public.pyblocks_live_chat_messages for select to authenticated
using (private.pyblocks_is_lobby_member(lobby_id, (select auth.uid())));
create policy "Lobby members can send chat"
on public.pyblocks_live_chat_messages for insert to authenticated
with check (
    sender_id = (select auth.uid())
    and private.pyblocks_is_lobby_member(lobby_id, (select auth.uid()))
    and exists (
        select 1 from public.pyblocks_live_lobbies lobby
        where lobby.id = lobby_id and lobby.is_open
    )
);

create policy "Published contributor credits are public"
on public.pyblocks_project_contributors for select to anon, authenticated
using (
    exists (
        select 1 from public.pyblocks_projects project
        where project.id = project_id and project.is_published
    )
    or exists (
        select 1 from public.pyblocks_projects project
        where project.id = project_id and project.user_id = (select auth.uid())
    )
);

revoke all on public.pyblocks_live_chat_messages,
    public.pyblocks_project_contributors from anon, authenticated;
grant select, insert on public.pyblocks_live_chat_messages to authenticated;
grant select on public.pyblocks_project_contributors to anon, authenticated;
