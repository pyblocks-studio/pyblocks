-- PostgREST upserts can apply SELECT visibility while returning or resolving a
-- row. Let a user see their own new membership immediately, while preserving
-- full member-list access for everyone already seated in that lobby.
drop policy if exists "Lobby members can read members"
on public.pyblocks_live_lobby_members;
create policy "Lobby members can read members"
on public.pyblocks_live_lobby_members for select to authenticated
using (
    user_id = (select auth.uid())
    or private.pyblocks_is_lobby_member(
        lobby_id,
        (select auth.uid())
    )
);
