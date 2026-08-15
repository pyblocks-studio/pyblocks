-- PyBlocks Live Edit: friendships, four-seat lobbies, and realtime invitations.
create table if not exists public.pyblocks_friendships (
    id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references auth.users(id) on delete cascade,
    addressee_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (requester_id <> addressee_id)
);

create unique index if not exists pyblocks_friendships_pair_uidx
on public.pyblocks_friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
);
create index if not exists pyblocks_friendships_requester_idx
on public.pyblocks_friendships (requester_id);
create index if not exists pyblocks_friendships_addressee_idx
on public.pyblocks_friendships (addressee_id);

create table if not exists public.pyblocks_live_lobbies (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null unique references public.pyblocks_projects(id) on delete cascade,
    owner_id uuid not null references auth.users(id) on delete cascade,
    is_open boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.pyblocks_live_lobby_members (
    lobby_id uuid not null references public.pyblocks_live_lobbies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    primary key (lobby_id, user_id)
);
create index if not exists pyblocks_live_lobbies_owner_idx
on public.pyblocks_live_lobbies (owner_id);
create index if not exists pyblocks_live_members_user_idx
on public.pyblocks_live_lobby_members (user_id);

create table if not exists public.pyblocks_live_invites (
    id uuid primary key default gen_random_uuid(),
    lobby_id uuid not null references public.pyblocks_live_lobbies(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    recipient_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'expired')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '10 minutes'),
    responded_at timestamptz,
    check (sender_id <> recipient_id)
);

create unique index if not exists pyblocks_live_pending_invite_uidx
on public.pyblocks_live_invites (lobby_id, recipient_id)
where status = 'pending';
create index if not exists pyblocks_live_invites_sender_idx
on public.pyblocks_live_invites (sender_id);
create index if not exists pyblocks_live_invites_recipient_idx
on public.pyblocks_live_invites (recipient_id, status, expires_at desc);

create schema if not exists private;

create or replace function private.pyblocks_are_friends(left_user uuid, right_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.pyblocks_friendships friendship
        where friendship.status = 'accepted'
          and (
              (friendship.requester_id = left_user and friendship.addressee_id = right_user)
              or (friendship.requester_id = right_user and friendship.addressee_id = left_user)
          )
    );
$$;

create or replace function private.pyblocks_is_lobby_member(target_lobby uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.pyblocks_live_lobby_members member
        where member.lobby_id = target_lobby and member.user_id = target_user
    );
$$;

revoke all on function private.pyblocks_are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function private.pyblocks_is_lobby_member(uuid, uuid) from public, anon, authenticated;

create or replace function private.pyblocks_validate_live_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    lobby public.pyblocks_live_lobbies;
begin
    select * into lobby from public.pyblocks_live_lobbies where id = new.lobby_id for update;
    if lobby.id is null or not lobby.is_open then
        raise exception 'This Live Edit lobby is closed.';
    end if;
    if new.user_id <> lobby.owner_id and not exists (
        select 1 from public.pyblocks_live_invites invite
        where invite.lobby_id = new.lobby_id
          and invite.recipient_id = new.user_id
          and invite.status = 'accepted'
          and invite.expires_at > now()
    ) then
        raise exception 'Accept a valid invitation before joining.';
    end if;
    delete from public.pyblocks_live_lobby_members member
    where member.lobby_id = new.lobby_id
      and member.last_seen_at < now() - interval '2 minutes';
    if not exists (
        select 1 from public.pyblocks_live_lobby_members member
        where member.lobby_id = new.lobby_id and member.user_id = new.user_id
    ) and (
        select count(*) from public.pyblocks_live_lobby_members member
        where member.lobby_id = new.lobby_id
    ) >= 4 then
        raise exception 'This Live Edit lobby already has four editors.';
    end if;
    new.last_seen_at := now();
    return new;
end;
$$;

revoke all on function private.pyblocks_validate_live_member() from public, anon, authenticated;
drop trigger if exists pyblocks_validate_live_member on public.pyblocks_live_lobby_members;
create trigger pyblocks_validate_live_member
before insert or update on public.pyblocks_live_lobby_members
for each row execute function private.pyblocks_validate_live_member();

alter table public.pyblocks_friendships enable row level security;
alter table public.pyblocks_live_lobbies enable row level security;
alter table public.pyblocks_live_lobby_members enable row level security;
alter table public.pyblocks_live_invites enable row level security;

create policy "Friendship participants can read"
on public.pyblocks_friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));
create policy "Users can request friendships"
on public.pyblocks_friendships for insert to authenticated
with check ((select auth.uid()) = requester_id and status = 'pending');
create policy "Recipients can accept friendships"
on public.pyblocks_friendships for update to authenticated
using ((select auth.uid()) = addressee_id)
with check ((select auth.uid()) = addressee_id and status = 'accepted');
create policy "Participants can remove friendships"
on public.pyblocks_friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Lobby participants can read lobbies"
on public.pyblocks_live_lobbies for select to authenticated
using (
    owner_id = (select auth.uid())
    or private.pyblocks_is_lobby_member(id, (select auth.uid()))
    or exists (
        select 1 from public.pyblocks_live_invites invite
        where invite.lobby_id = id and invite.recipient_id = (select auth.uid())
    )
);
create policy "Project owners can create lobbies"
on public.pyblocks_live_lobbies for insert to authenticated
with check (
    owner_id = (select auth.uid()) and exists (
        select 1 from public.pyblocks_projects project
        where project.id = project_id and project.user_id = (select auth.uid())
    )
);
create policy "Lobby owners can update lobbies"
on public.pyblocks_live_lobbies for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
create policy "Lobby owners can delete lobbies"
on public.pyblocks_live_lobbies for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Lobby members can read members"
on public.pyblocks_live_lobby_members for select to authenticated
using (private.pyblocks_is_lobby_member(lobby_id, (select auth.uid())));
create policy "Invited users can join lobbies"
on public.pyblocks_live_lobby_members for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Members can refresh their seat"
on public.pyblocks_live_lobby_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "Members and owners can release seats"
on public.pyblocks_live_lobby_members for delete to authenticated
using (
    user_id = (select auth.uid()) or exists (
        select 1 from public.pyblocks_live_lobbies lobby
        where lobby.id = lobby_id and lobby.owner_id = (select auth.uid())
    )
);

create policy "Invite participants can read invitations"
on public.pyblocks_live_invites for select to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Lobby members can invite accepted friends"
on public.pyblocks_live_invites for insert to authenticated
with check (
    sender_id = (select auth.uid())
    and private.pyblocks_is_lobby_member(lobby_id, (select auth.uid()))
    and private.pyblocks_are_friends(sender_id, recipient_id)
    and status = 'pending'
);
create policy "Recipients can answer invitations"
on public.pyblocks_live_invites for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()) and status in ('accepted', 'dismissed'));
create policy "Senders can delete invitations"
on public.pyblocks_live_invites for delete to authenticated
using (sender_id = (select auth.uid()));

create policy "Live editors can read the shared cloud project"
on public.pyblocks_projects for select to authenticated
using (
    exists (
        select 1 from public.pyblocks_live_lobbies lobby
        where lobby.project_id = id
          and lobby.is_open
          and private.pyblocks_is_lobby_member(lobby.id, (select auth.uid()))
    )
);

revoke all on public.pyblocks_friendships, public.pyblocks_live_lobbies,
    public.pyblocks_live_lobby_members, public.pyblocks_live_invites from anon, authenticated;
grant select, insert, update, delete on public.pyblocks_friendships,
    public.pyblocks_live_lobbies, public.pyblocks_live_lobby_members,
    public.pyblocks_live_invites to authenticated;

-- Private channels are authorized only for users holding a lobby seat.
drop policy if exists "Live editors can receive lobby broadcasts" on realtime.messages;
create policy "Live editors can receive lobby broadcasts"
on realtime.messages for select to authenticated
using (
    realtime.topic() like 'pyblocks-live:%'
    and private.pyblocks_is_lobby_member(
        split_part(realtime.topic(), ':', 2)::uuid,
        (select auth.uid())
    )
);
drop policy if exists "Live editors can send lobby broadcasts" on realtime.messages;
create policy "Live editors can send lobby broadcasts"
on realtime.messages for insert to authenticated
with check (
    realtime.topic() like 'pyblocks-live:%'
    and private.pyblocks_is_lobby_member(
        split_part(realtime.topic(), ':', 2)::uuid,
        (select auth.uid())
    )
);

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'pyblocks_live_invites'
    ) then
        alter publication supabase_realtime add table public.pyblocks_live_invites;
    end if;
end
$$;
