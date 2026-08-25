-- Execute este arquivo uma vez no Supabase: SQL Editor > New query > Run.
create table if not exists public.finance_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  brand text default 'MYFINANCE',
  heading text default 'Visão financeira familiar',
  subtitle text default 'Robson & Gabi',
  theme_bg text not null default '#030504',
  theme_accent text not null default '#2f9d6f',
  theme_surface text not null default '#0d110f',
  finance_mode text not null default 'individual' check (finance_mode in ('individual', 'family')),
  primary_person_name text not null default 'Titular',
  secondary_person_name text not null default 'Pessoa 2',
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_months (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-(0[1-9]|1[0-2]) not null default 0,
  income_robson numeric,
  income_gabi numeric,
  freelancers jsonb not null default '[]'::jsonb,
  food_robson numeric not null default 0,
  food_gabi numeric not null default 0,
  expenses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

create index if not exists finance_months_user_month_idx on public.finance_months(user_id, month_key);
alter table public.finance_state enable row level security;
alter table public.finance_months enable row level security;

drop policy if exists "Users manage own finance state" on public.finance_state;
create policy "Users manage own finance state" on public.finance_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance months" on public.finance_months;
create policy "Users manage own finance months" on public.finance_months
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.finance_state from anon;
revoke all on public.finance_months from anon;
grant select, insert, update, delete on public.finance_state to authenticated;
grant select, insert, update, delete on public.finance_months to authenticated;
),
  due_periods jsonb not null default '[10]'::jsonb,
  income numeric not null default 0,
  income_robson numeric,
  income_gabi numeric,
  freelancers jsonb not null default '[]'::jsonb,
  food_robson numeric not null default 0,
  food_gabi numeric not null default 0,
  expenses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

create index if not exists finance_months_user_month_idx on public.finance_months(user_id, month_key);
alter table public.finance_state enable row level security;
alter table public.finance_months enable row level security;

drop policy if exists "Users manage own finance state" on public.finance_state;
create policy "Users manage own finance state" on public.finance_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance months" on public.finance_months;
create policy "Users manage own finance months" on public.finance_months
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.finance_state from anon;
revoke all on public.finance_months from anon;
grant select, insert, update, delete on public.finance_state to authenticated;
grant select, insert, update, delete on public.finance_months to authenticated;
