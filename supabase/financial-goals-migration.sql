create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal_type text not null default 'custom' check (goal_type in ('emergency','debt','travel','purchase','education','vehicle','home','custom')),
  target_amount numeric not null check (target_amount > 0),
  initial_amount numeric not null default 0 check (initial_amount >= 0),
  monthly_amount numeric not null default 0 check (monthly_amount >= 0),
  target_date date,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  color text not null default '#9b6de3',
  icon text not null default '◎',
  linked_expense_id bigint,
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_goals_user_idx on public.finance_goals(user_id);
create index if not exists finance_goals_user_priority_idx on public.finance_goals(user_id, priority, created_at);

alter table public.finance_goals enable row level security;

drop policy if exists "Users manage own finance goals" on public.finance_goals;
create policy "Users manage own finance goals"
on public.finance_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);