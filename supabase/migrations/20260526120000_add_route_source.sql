-- Distinguish auto-saved ridden trails from user-planned routes.
alter table public.saved_routes
  add column if not exists source text not null default 'planned'
  check (source in ('planned', 'ridden'));
