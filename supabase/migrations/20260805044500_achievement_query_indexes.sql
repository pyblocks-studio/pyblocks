-- Keep achievement synchronization and announcement polling fast as data grows.
create index if not exists pyblocks_projects_remixed_from_idx
on public.pyblocks_projects (remixed_from_project_id)
where remixed_from_project_id is not null;

create index if not exists pyblocks_announcements_active_created_idx
on public.pyblocks_announcements (created_at desc)
where active;

drop policy if exists "Admins can see admin list"
on public.pyblocks_admins;
create policy "Admins can see admin list"
on public.pyblocks_admins for select
to authenticated
using ((select public.pyblocks_is_admin((select auth.uid()))));

drop policy if exists "Admins create announcements"
on public.pyblocks_announcements;
create policy "Admins create announcements"
on public.pyblocks_announcements for insert
to authenticated
with check (
    (select public.pyblocks_is_admin((select auth.uid())))
    and author_id = (select auth.uid())
);

drop policy if exists "Admins retire announcements"
on public.pyblocks_announcements;
create policy "Admins retire announcements"
on public.pyblocks_announcements for update
to authenticated
using ((select public.pyblocks_is_admin((select auth.uid()))))
with check ((select public.pyblocks_is_admin((select auth.uid()))));
