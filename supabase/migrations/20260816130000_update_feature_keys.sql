-- Stable keys connect queued release records to dormant frontend features.
alter table public.pyblocks_updates
add column if not exists feature_key text;

alter table public.pyblocks_updates
drop constraint if exists pyblocks_updates_feature_key_format;

alter table public.pyblocks_updates
add constraint pyblocks_updates_feature_key_format
check (
    feature_key is null
    or feature_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
);

create unique index if not exists pyblocks_updates_feature_key_uidx
on public.pyblocks_updates (feature_key)
where feature_key is not null;
