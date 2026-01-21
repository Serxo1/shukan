-- ========================================
-- PROFILES (extensão do auth.users)
-- ========================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- CATEGORIES (categorias de hábitos)
-- ========================================
create table public.categories (
  id serial primary key,
  name text unique not null,
  icon text,
  color text
);

insert into public.categories (name, icon, color) values
  ('fitness', '💪', '#EF4444'),
  ('mindfulness', '🧘', '#8B5CF6'),
  ('learning', '📚', '#3B82F6'),
  ('health', '❤️', '#EC4899'),
  ('productivity', '⚡', '#F59E0B'),
  ('social', '👥', '#10B981'),
  ('creativity', '🎨', '#6366F1'),
  ('finance', '💰', '#84CC16'),
  ('other', '✨', '#6B7280');

-- ========================================
-- HABITS (hábitos do usuário)
-- ========================================
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  category_id int references public.categories default 9,
  name text not null,
  frequency text default 'daily',
  icon text default '⭐',
  color text default '#8B5CF6',
  target_type text default 'boolean',
  target_value real default 1,
  target_unit text,
  streak int default 0,
  best_streak int default 0,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- COMPLETIONS (registros de conclusão)
-- ========================================
create table public.completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  date date default current_date not null,
  value real default 1,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

-- ========================================
-- FRIENDSHIPS (amizades)
-- ========================================
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles on delete cascade not null,
  addressee_id uuid references public.profiles on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- ========================================
-- COMPETITIONS
-- ========================================
create table public.competitions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  category_id int references public.categories,
  creator_id uuid references public.profiles on delete cascade not null,
  start_date date not null,
  end_date date not null,
  is_public boolean default false,
  created_at timestamptz default now()
);

create table public.competition_participants (
  competition_id uuid references public.competitions on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (competition_id, user_id)
);

-- ========================================
-- VIEWS (rankings)
-- ========================================
create view public.category_rankings as
select
  h.category_id,
  c.name as category_name,
  h.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  sum(h.streak) as total_streak,
  count(distinct h.id) as habit_count,
  count(distinct comp.date) as total_completions
from public.habits h
join public.profiles p on p.id = h.user_id
join public.categories c on c.id = h.category_id
left join public.completions comp on comp.habit_id = h.id
where h.is_public = true and p.is_public = true
group by h.category_id, c.name, h.user_id, p.username, p.display_name, p.avatar_url;

-- ========================================
-- INDEXES
-- ========================================
create index idx_habits_user on public.habits(user_id);
create index idx_habits_category on public.habits(category_id);
create index idx_completions_habit on public.completions(habit_id);
create index idx_completions_date on public.completions(date);
create index idx_completions_user on public.completions(user_id);
create index idx_friendships_users on public.friendships(requester_id, addressee_id);

-- ========================================
-- RLS (Row Level Security)
-- ========================================
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.completions enable row level security;
alter table public.friendships enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_participants enable row level security;

-- Profiles
create policy "Public profiles visible" on public.profiles
  for select using (is_public = true or auth.uid() = id);
create policy "Own profile editable" on public.profiles
  for all using (auth.uid() = id);

-- Habits
create policy "Own habits" on public.habits
  for all using (auth.uid() = user_id);
create policy "Friends public habits" on public.habits
  for select using (
    is_public = true and
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = user_id)
        or (f.addressee_id = auth.uid() and f.requester_id = user_id))
    )
  );

-- Completions
create policy "Own completions" on public.completions
  for all using (auth.uid() = user_id);

-- Friendships
create policy "Own friendships" on public.friendships
  for all using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Competitions
create policy "View public competitions" on public.competitions
  for select using (is_public = true or creator_id = auth.uid());
create policy "Manage own competitions" on public.competitions
  for all using (auth.uid() = creator_id);

-- Competition participants
create policy "View participants" on public.competition_participants
  for select using (true);
create policy "Join competitions" on public.competition_participants
  for insert with check (auth.uid() = user_id);
create policy "Leave competitions" on public.competition_participants
  for delete using (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', 'User')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger update_habits_updated_at before update on public.habits
  for each row execute procedure public.update_updated_at();
create trigger update_friendships_updated_at before update on public.friendships
  for each row execute procedure public.update_updated_at();
