# Migração para Supabase

## 1. Criar as tabelas

No Supabase, abra **SQL Editor**, crie uma nova consulta, cole o conteúdo de
`supabase/schema.sql` e execute.

## 2. Criar a primeira conta

Abra **Authentication > Users > Add user** e cadastre o e-mail e a senha que
serão usados no login do Shift Zone. Cada conta terá dados financeiros isolados.

## 3. Configurar variáveis

Cadastre no serviço de hospedagem:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente no servidor)
- `DASH_SESSION_SECRET` (texto aleatório longo)

As chaves ficam em **Project Settings > API**. Nunca envie a
`SUPABASE_SERVICE_ROLE_KEY` ao GitHub nem exponha no navegador.

## 4. Recuperar os dados atuais

Entre no aplicativo com a conta criada, abra **Dados e backup** e restaure
`dados/backup-financeiro-completo.json`. A restauração associa todo o histórico
à conta conectada.

## Resultado

- Login por e-mail e senha via Supabase Auth.
- Dados separados por usuário.
- PostgreSQL no lugar do Cloudflare D1.
- Row Level Security habilitado.
- Backup, restauração, Excel, PDF, resumo anual e PWA preservados.
