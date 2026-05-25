-- =============================================================================
-- MotoPilot — initial schema
-- Profiles, Saved Routes (PostGIS + GeoJSON), Connected Services, Rider Groups,
-- and live location sharing for group rides.
--
-- Conventions:
--   * Every user-owned row keys off auth.users(id).
--   * Row Level Security is ON for every table; policies are owner-scoped
--     unless a row is explicitly shared with a rider group.
--   * Geometry is stored in EPSG:4326 (WGS84, lon/lat) for Apple Maps overlay.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"  with schema extensions;  -- gen_random_uuid
create extension if not exists "postgis"   with schema extensions;  -- geometry types

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.route_preference as enum ('fastest', 'shortest', 'curvy', 'scenic');
create type public.service_provider  as enum ('spotify', 'apple_music', 'komoot', 'strava');
create type public.member_role       as enum ('owner', 'admin', 'member');
create type public.distance_unit     as enum ('metric', 'imperial');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps an updated_at column fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles
-- 1:1 with auth.users. Auto-created on signup via trigger below.
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bike_make    text,
  bike_model   text,
  bike_year    int,
  units        public.distance_unit not null default 'metric',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint username_length check (username is null or char_length(username) between 3 and 30)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Provision a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- rider_groups + membership
-- =============================================================================
create table public.rider_groups (
  id         uuid primary key default extensions.gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  join_code  text not null unique default upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rider_groups_set_updated_at
  before update on public.rider_groups
  for each row execute function public.set_updated_at();

create table public.rider_group_members (
  group_id  uuid not null references public.rider_groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index rider_group_members_user_idx on public.rider_group_members (user_id);

-- SECURITY DEFINER membership checks. These bypass RLS so that group/member
-- policies can reference membership without recursive policy evaluation.
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rider_group_members m
    where m.group_id = p_group and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rider_group_members m
    where m.group_id = p_group
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- Seed the creator as the owning member of any new group.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rider_group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_rider_group_created
  after insert on public.rider_groups
  for each row execute function public.handle_new_group();

-- =============================================================================
-- saved_routes
-- Stores both the PostGIS LineString (for spatial queries / distance) and the
-- raw GeoJSON returned by the routing API (for direct re-draw on the map).
-- =============================================================================
create table public.saved_routes (
  id              uuid primary key default extensions.gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  preference      public.route_preference not null default 'fastest',
  geometry        extensions.geometry(LineString, 4326),
  geojson         jsonb not null,
  waypoints       jsonb,                       -- ordered [{lat,lon,label}] stops
  distance_meters double precision,
  duration_secs   double precision,
  is_favorite     boolean not null default false,
  shared_group_id uuid references public.rider_groups (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index saved_routes_user_idx     on public.saved_routes (user_id);
create index saved_routes_geom_gix      on public.saved_routes using gist (geometry);
create index saved_routes_shared_idx    on public.saved_routes (shared_group_id) where shared_group_id is not null;

create trigger saved_routes_set_updated_at
  before update on public.saved_routes
  for each row execute function public.set_updated_at();

-- Derive the PostGIS LineString from the stored GeoJSON so the client only has
-- to send `geojson` (sending a geometry column over PostgREST is awkward).
create or replace function public.set_route_geometry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.geojson is not null then
    new.geometry := extensions.st_setsrid(
      extensions.st_geomfromgeojson(new.geojson::text), 4326
    );
  end if;
  return new;
end;
$$;

create trigger saved_routes_set_geometry
  before insert or update of geojson on public.saved_routes
  for each row execute function public.set_route_geometry();

-- =============================================================================
-- connected_services
-- OAuth tokens for media/fitness providers. Highly sensitive: owner-only RLS,
-- never exposed to other users. Consider Supabase Vault for at-rest encryption
-- of the token columns in production.
-- =============================================================================
create table public.connected_services (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  provider      public.service_provider not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text[],
  provider_user_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger connected_services_set_updated_at
  before update on public.connected_services
  for each row execute function public.set_updated_at();

-- =============================================================================
-- rider_locations
-- Live position pings for group rides. Realtime-enabled (see publication below).
-- One latest row per (group, user) — upsert on the unique key.
--
-- lat/lon are the source of truth so realtime payloads are plain numbers
-- (a geometry column would arrive as EWKB hex). `position` is a generated
-- geometry column kept in sync for spatial queries / GIST indexing.
-- =============================================================================
create table public.rider_locations (
  group_id       uuid not null references public.rider_groups (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  lat            double precision not null,
  lon            double precision not null,
  position       extensions.geometry(Point, 4326)
                   generated always as
                   (extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)) stored,
  heading        double precision,        -- degrees, 0-360
  speed_mps      double precision,        -- meters/second
  battery_pct    int,                     -- headset / device battery
  recorded_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index rider_locations_group_idx on public.rider_locations (group_id);
create index rider_locations_geom_gix   on public.rider_locations using gist (position);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles             enable row level security;
alter table public.rider_groups         enable row level security;
alter table public.rider_group_members  enable row level security;
alter table public.saved_routes         enable row level security;
alter table public.connected_services   enable row level security;
alter table public.rider_locations      enable row level security;

-- ---- profiles --------------------------------------------------------------
-- Profiles are readable by any authenticated user (display names in group lists);
-- writable only by the owner.
create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- rider_groups ----------------------------------------------------------
create policy "members can view their groups"
  on public.rider_groups for select
  to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

create policy "users can create groups they own"
  on public.rider_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "owners and admins can update groups"
  on public.rider_groups for update
  to authenticated
  using (owner_id = auth.uid() or public.is_group_admin(id))
  with check (owner_id = auth.uid() or public.is_group_admin(id));

create policy "owners can delete groups"
  on public.rider_groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---- rider_group_members ---------------------------------------------------
create policy "members can view the roster of their groups"
  on public.rider_group_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id));

-- A user may add themselves (join via code, enforced app-side) or an admin may
-- add others.
create policy "users can join groups or admins can add members"
  on public.rider_group_members for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_group_admin(group_id));

create policy "members can leave or admins can manage roles"
  on public.rider_group_members for update
  to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id))
  with check (user_id = auth.uid() or public.is_group_admin(group_id));

create policy "members can leave or admins can remove members"
  on public.rider_group_members for delete
  to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

-- ---- saved_routes ----------------------------------------------------------
create policy "owners can view their routes; group members see shared routes"
  on public.saved_routes for select
  to authenticated
  using (
    user_id = auth.uid()
    or (shared_group_id is not null and public.is_group_member(shared_group_id))
  );

create policy "users can insert their own routes"
  on public.saved_routes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can update their own routes"
  on public.saved_routes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own routes"
  on public.saved_routes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---- connected_services (owner-only, fully private) ------------------------
create policy "users manage only their own connected services"
  on public.connected_services for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- rider_locations -------------------------------------------------------
create policy "group members can view live locations"
  on public.rider_locations for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "users can publish their own location to groups they belong to"
  on public.rider_locations for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "users can update their own location"
  on public.rider_locations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "users can clear their own location"
  on public.rider_locations for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- RPC: join a group by its share code
-- A non-member can't SELECT the group (RLS), so joining by code must run in a
-- SECURITY DEFINER function that adds the caller as a member.
-- =============================================================================
create or replace function public.join_group_by_code(p_code text)
returns public.rider_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.rider_groups;
begin
  select * into g
  from public.rider_groups
  where join_code = upper(p_code) and is_active
  limit 1;

  if g.id is null then
    raise exception 'No active group found for that code' using errcode = 'no_data_found';
  end if;

  insert into public.rider_group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;

-- =============================================================================
-- Realtime
-- Expose live group data to supabase-js .channel() subscriptions.
-- =============================================================================
alter publication supabase_realtime add table public.rider_locations;
alter publication supabase_realtime add table public.rider_group_members;
