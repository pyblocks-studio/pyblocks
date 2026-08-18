-- Permanently retire Live Edit while preserving the independent friends list.
drop policy if exists "Live editors can receive lobby broadcasts"
on realtime.messages;
drop policy if exists "Live editors can send lobby broadcasts"
on realtime.messages;

drop policy if exists "Live editors can read the shared cloud project"
on public.pyblocks_projects;

drop trigger if exists pyblocks_record_live_contributor
on public.pyblocks_live_lobby_members;
drop trigger if exists pyblocks_validate_live_member
on public.pyblocks_live_lobby_members;

drop function if exists private.pyblocks_record_live_contributor();
drop function if exists private.pyblocks_validate_live_member();
drop function if exists private.pyblocks_is_lobby_member(uuid, uuid);
drop function if exists private.pyblocks_user_owns_project(uuid, uuid);
drop function if exists private.pyblocks_are_friends(uuid, uuid);

drop table if exists public.pyblocks_live_chat_messages;
drop table if exists public.pyblocks_project_contributors;
drop table if exists public.pyblocks_live_invites;
drop table if exists public.pyblocks_live_lobby_members;
drop table if exists public.pyblocks_live_lobbies;

delete from public.pyblocks_updates
where feature_key = 'remove-live-edit';
