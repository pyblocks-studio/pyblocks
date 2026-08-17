-- Cover release queue foreign keys used during account deletion and admin audits.
create index if not exists pyblocks_updates_created_by_idx
on public.pyblocks_updates (created_by);

create index if not exists pyblocks_site_commands_created_by_idx
on public.pyblocks_site_commands (created_by);
