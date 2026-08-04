-- Enforce banner ownership independently of permissive profile update policies.
create or replace function private.pyblocks_validate_equipped_banner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.equipped_banner_id is distinct from old.equipped_banner_id
       and new.equipped_banner_id is not null
       and not exists (
           select 1
           from public.pyblocks_user_banners ub
           where ub.user_id = new.user_id
             and ub.banner_id = new.equipped_banner_id
       )
    then
        raise exception 'Banner has not been unlocked';
    end if;
    return new;
end;
$$;

revoke all on function private.pyblocks_validate_equipped_banner()
from public, anon, authenticated;

drop trigger if exists pyblocks_validate_equipped_banner
on public.pyblocks_profiles;
create trigger pyblocks_validate_equipped_banner
before update of equipped_banner_id on public.pyblocks_profiles
for each row execute function private.pyblocks_validate_equipped_banner();

drop policy if exists "Users equip owned banners"
on public.pyblocks_profiles;

drop policy if exists "Admins can see admin list"
on public.pyblocks_admins;
create policy "Admins can see admin list"
on public.pyblocks_admins for select
to authenticated
using ((select public.pyblocks_is_admin(auth.uid())));

drop policy if exists "Admins retire announcements"
on public.pyblocks_announcements;
create policy "Admins retire announcements"
on public.pyblocks_announcements for update
to authenticated
using ((select public.pyblocks_is_admin(auth.uid())))
with check ((select public.pyblocks_is_admin(auth.uid())));

create index if not exists pyblocks_achievements_reward_banner_idx
on public.pyblocks_achievements (reward_banner_id);
create index if not exists pyblocks_admins_granted_by_idx
on public.pyblocks_admins (granted_by);
create index if not exists pyblocks_announcements_author_idx
on public.pyblocks_announcements (author_id);
create index if not exists pyblocks_profiles_equipped_banner_idx
on public.pyblocks_profiles (equipped_banner_id);
create index if not exists pyblocks_user_achievements_achievement_idx
on public.pyblocks_user_achievements (achievement_id);
create index if not exists pyblocks_user_banners_banner_idx
on public.pyblocks_user_banners (banner_id);
create index if not exists pyblocks_user_banners_granted_by_idx
on public.pyblocks_user_banners (granted_by);
