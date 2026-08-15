-- Allow signed-in requests to evaluate the private helpers used by Live Edit
-- RLS policies. The private schema remains outside the Data API, so these
-- functions cannot be invoked as public RPC endpoints.
grant execute on function private.pyblocks_is_lobby_member(uuid, uuid)
to authenticated;
grant execute on function private.pyblocks_are_friends(uuid, uuid)
to authenticated;

-- Qualify the project id so the policy compares the lobby's project with the
-- row currently being evaluated, rather than the lobby id.
drop policy if exists "Live editors can read the shared cloud project"
on public.pyblocks_projects;
create policy "Live editors can read the shared cloud project"
on public.pyblocks_projects for select to authenticated
using (
    exists (
        select 1
        from public.pyblocks_live_lobbies lobby
        where lobby.project_id = pyblocks_projects.id
          and lobby.is_open
          and private.pyblocks_is_lobby_member(
              lobby.id,
              (select auth.uid())
          )
    )
);
