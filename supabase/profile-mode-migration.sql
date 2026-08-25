-- Execute uma vez no Supabase SQL Editor antes de publicar a atualização do app.
-- A migração não altera nem remove rendas, benefícios, contas ou usuários existentes.

alter table public.finance_state
  add column if not exists finance_mode text not null default 'individual',
  add column if not exists primary_person_name text not null default 'Titular',
  add column if not exists secondary_person_name text not null default 'Pessoa 2';

alter table public.finance_state
  drop constraint if exists finance_state_finance_mode_check;

alter table public.finance_state
  add constraint finance_state_finance_mode_check
  check (finance_mode in ('individual', 'family'));
