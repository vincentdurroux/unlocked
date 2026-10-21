-- SQL to create the survey table in Supabase
create table public.user_acquisition_survey (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    source text not null,
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_acquisition_survey enable row level security;

-- Policy to allow authenticated users to insert their own survey response
create policy "Allow users to insert their own survey" on public.user_acquisition_survey 
for insert with check (auth.uid() = user_id);

-- Policy to allow users to read their own survey response (optional)
create policy "Allow users to read their own survey" on public.user_acquisition_survey 
for select using (auth.uid() = user_id);
