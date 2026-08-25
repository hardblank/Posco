-- Execute uma vez no Supabase SQL Editor antes de publicar os vencimentos dinâmicos.
-- As contas existentes e seus vencimentos atuais são preservados.

alter table public.finance_months
  add column if not exists due_periods jsonb;

-- Preserva a organização antiga em dias 10 e 20 para meses já cadastrados.
update public.finance_months
set due_periods = '[10, 20]'::jsonb
where due_periods is null;

alter table public.finance_months
  alter column due_periods set default '[10]'::jsonb,
  alter column due_periods set not null;
