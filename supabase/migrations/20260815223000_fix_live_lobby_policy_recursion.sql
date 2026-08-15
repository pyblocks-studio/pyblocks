-- Break the projects -> lobbies -> projects RLS cycle when a host starts a
-- Live Edit room. The helper is kept in the unexposed private schema and only
-- approves checks for the currently authenticated user.
create or replace function private.pyblocks_user_owns_project(
    target_project uuid,
    target_user uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select target_user = (select auth.uid())
       and exists (
           select 1
           from public.pyblocks_projects project
           where project.id = target_project
             and project.user_id = target_user
       );
$$;

revoke all on function private.pyblocks_user_owns_project(uuid, uuid)
from public, anon;
grant execute on function private.pyblocks_user_owns_project(uuid, uuid)
to authenticated;

drop policy if exists "Project owners can create lobbies"
on public.pyblocks_live_lobbies;
create policy "Project owners can create lobbies"
on public.pyblocks_live_lobbies for insert to authenticated
with check (
    owner_id = (select auth.uid())
    and private.pyblocks_user_owns_project(
        project_id,
        (select auth.uid())
    )
);

-- Qualify the outer lobby id so an invitation is matched to the lobby being
-- evaluated rather than comparing two columns from the invitation itself.
drop policy if exists "Lobby participants can read lobbies"
on public.pyblocks_live_lobbies;
create policy "Lobby participants can read lobbies"
on public.pyblocks_live_lobbies for select to authenticated
using (
    owner_id = (select auth.uid())
    or private.pyblocks_is_lobby_member(id, (select auth.uid()))
    or exists (
        select 1
        from public.pyblocks_live_invites invite
        where invite.lobby_id = pyblocks_live_lobbies.id
          and invite.recipient_id = (select auth.uid())
    )
);
