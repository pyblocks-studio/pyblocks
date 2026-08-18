-- Permanently retire Live Edit while preserving the independent friends list.
drop policy if exists "Live editors can receive lobby broadcasts"
on realtime.messages;
drop policy if exists "Live editors can send lobby broadcasts"
on realtime.messages;

drop policy if exists "Live editors can read the shared cloud project"
on public.pyblocks_projects;

-- CASCADE is scoped to these retired tables so their cross-table policies,
-- triggers, and constraints are removed before their helper functions.
drop table if exists public.pyblocks_live_chat_messages cascade;
drop table if exists public.pyblocks_project_contributors cascade;
drop table if exists public.pyblocks_live_invites cascade;
drop table if exists public.pyblocks_live_lobby_members cascade;
drop table if exists public.pyblocks_live_lobbies cascade;

drop function if exists private.pyblocks_record_live_contributor();
drop function if exists private.pyblocks_validate_live_member();
drop function if exists private.pyblocks_is_lobby_member(uuid, uuid);
drop function if exists private.pyblocks_user_owns_project(uuid, uuid);
drop function if exists private.pyblocks_are_friends(uuid, uuid);

delete from public.pyblocks_updates
where feature_key = 'remove-live-edit';
