create table if not exists public.portfolio_works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  tags text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_work_files (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.portfolio_works(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default '',
  is_image boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_works enable row level security;
alter table public.portfolio_work_files enable row level security;

drop policy if exists "Portfolio works are public" on public.portfolio_works;
create policy "Portfolio works are public"
  on public.portfolio_works for select using (true);

drop policy if exists "Portfolio owner can insert works" on public.portfolio_works;
create policy "Portfolio owner can insert works"
  on public.portfolio_works for insert to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can update works" on public.portfolio_works;
create policy "Portfolio owner can update works"
  on public.portfolio_works for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can delete works" on public.portfolio_works;
create policy "Portfolio owner can delete works"
  on public.portfolio_works for delete to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio work files are public" on public.portfolio_work_files;
create policy "Portfolio work files are public"
  on public.portfolio_work_files for select using (true);

drop policy if exists "Portfolio owner can add work files" on public.portfolio_work_files;
create policy "Portfolio owner can add work files"
  on public.portfolio_work_files for insert to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can update work files" on public.portfolio_work_files;
create policy "Portfolio owner can update work files"
  on public.portfolio_work_files for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can remove work files" on public.portfolio_work_files;
create policy "Portfolio owner can remove work files"
  on public.portfolio_work_files for delete to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('portfolio-files', 'portfolio-files', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Public can view portfolio files" on storage.objects;
create policy "Public can view portfolio files"
  on storage.objects for select using (bucket_id = 'portfolio-files');

drop policy if exists "Portfolio owner can upload files" on storage.objects;
create policy "Portfolio owner can upload files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-files' and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can update files" on storage.objects;
create policy "Portfolio owner can update files"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-files' and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'))
  with check (bucket_id = 'portfolio-files' and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));

drop policy if exists "Portfolio owner can delete files" on storage.objects;
create policy "Portfolio owner can delete files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-files' and lower(coalesce(auth.jwt() ->> 'email', '')) = lower('thanatat720@gmail.com'));
