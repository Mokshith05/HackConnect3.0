-- Supabase schema migration for HackConnect

-- 1. Create tables

-- Create events table first, since it is referenced by profiles
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_by uuid, -- Can link to auth.users if needed
  created_at timestamptz default now()
);

-- Create profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  bio text,
  skills text[],
  interests text[],
  linkedin_url text,
  github_url text,
  looking_for text check (looking_for in ('teammate', 'mentor', 'collaborator', 'networking')),
  event_id uuid references events(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create event_participants table
create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Create connection_requests table
create table connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_id, event_id)
);

-- Create connections table
create table connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  connected_at timestamptz default now(),
  unique(user_a, user_b)
);

-- Create messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references connections(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Create blocked_users table
create table blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- Create location_status table
create table location_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  event_id uuid references events(id) on delete cascade,
  zone text,
  availability text default 'available' check (availability in ('available', 'busy', 'offline')),
  custom_note text,
  updated_at timestamptz default now()
);

-- Create ai_suggestions table
create table ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  suggested_user_id uuid references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  compatibility_score integer check (compatibility_score >= 0 and compatibility_score <= 100),
  reason text,
  icebreaker text,
  generated_at timestamptz default now()
);

-- Create reports table
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  reported_user_id uuid references profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);

-- 2. Enable Row-Level Security (RLS) on all tables

alter table profiles enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table connection_requests enable row level security;
alter table connections enable row level security;
alter table messages enable row level security;
alter table blocked_users enable row level security;
alter table location_status enable row level security;
alter table ai_suggestions enable row level security;
alter table reports enable row level security;

-- 3. RLS Policies

-- profiles
create policy "Public profiles readable" on profiles for select using (auth.role() = 'authenticated');
create policy "Own profile editable" on profiles for update using (auth.uid() = id);
create policy "Own profile insertable" on profiles for insert with check (auth.uid() = id);

-- events
create policy "Anyone authenticated can read events" on events for select using (auth.role() = 'authenticated');
create policy "Admin can manage events" on events for all using (
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- event_participants
create policy "Participants readable by authenticated" on event_participants for select using (auth.role() = 'authenticated');
create policy "Owner joins event" on event_participants for insert with check (user_id = auth.uid());
create policy "Owner leaves event" on event_participants for delete using (user_id = auth.uid());
create policy "Admin manages participants" on event_participants for delete using (
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- messages
create policy "Connection members only" on messages for all using (
  exists (
    select 1 from connections
    where id = messages.connection_id
    and (user_a = auth.uid() or user_b = auth.uid())
  )
);

-- blocked_users
create policy "Blocker sees own blocks" on blocked_users for select using (blocker_id = auth.uid());
create policy "Blocker inserts own blocks" on blocked_users for insert with check (blocker_id = auth.uid());
create policy "Blocker deletes own blocks" on blocked_users for delete using (blocker_id = auth.uid());

-- connection_requests
create policy "Own requests visible" on connection_requests for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "Sender can create" on connection_requests for insert with check (sender_id = auth.uid());
create policy "Receiver can update" on connection_requests for update using (receiver_id = auth.uid());
create policy "Sender can delete" on connection_requests for delete using (sender_id = auth.uid());

-- connections
create policy "Connected users visible" on connections for select using (user_a = auth.uid() or user_b = auth.uid());
create policy "Connected users delete connections" on connections for delete using (user_a = auth.uid() or user_b = auth.uid());

-- location_status
create policy "Own location editable" on location_status for all using (user_id = auth.uid());
create policy "Connected users see location" on location_status for select using (
  exists (
    select 1 from connections
    where (user_a = auth.uid() and user_b = location_status.user_id)
    or (user_b = auth.uid() and user_a = location_status.user_id)
  ) or user_id = auth.uid()
);

-- ai_suggestions
create policy "Own suggestions only" on ai_suggestions for select using (user_id = auth.uid());

-- reports
create policy "Own reports" on reports for insert with check (reporter_id = auth.uid());
create policy "Admin reads reports" on reports for select using (
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);
create policy "Admin updates reports" on reports for update using (
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

-- 4. Enable pg_cron for 7-day chat TTL (Run once cron extension is active)
-- select cron.schedule(
--   'delete-old-messages',
--   '0 2 * * *',
--   $$ delete from messages where created_at < now() - interval '7 days'; $$
-- );
