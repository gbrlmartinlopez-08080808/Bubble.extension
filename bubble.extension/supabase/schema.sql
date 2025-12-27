-- Create a table for public profiles using Supabase Auth
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text,
  full_name text,
  avatar_url text,

  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for user credits
create table user_credits (
  user_id uuid references auth.users on delete cascade not null primary key,
  amount integer default 50, -- Start with 50 free credits
  is_premium boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table user_credits enable row level security;

create policy "Users can view their own credits."
  on user_credits for select
  using ( auth.uid() = user_id );

-- Only service role (Edge Functions) can update credits
-- No update policy for public users.

-- Create a table for usage logs / history
create table usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  prompt_snippet text,
  model text,
  tokens_used integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table usage_logs enable row level security;

create policy "Users can view their own logs."
  on usage_logs for select
  using ( auth.uid() = user_id );

-- Create a table for securely storing User API keys (Encrypted)
-- Note: In this architecture, we primarily recommend chrome.storage.local for keys,
-- but this table is provided as requested for cross-device sync if encryption is handled.
create table user_api_keys (
  user_id uuid references auth.users on delete cascade not null primary key,
  encrypted_key text not null,
  key_label text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table user_api_keys enable row level security;

create policy "Users can manage their own keys."
  on user_api_keys for all
  using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  insert into public.user_credits (user_id, amount)
  values (new.id, 50);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
