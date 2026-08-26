# Backend do Prêmio IDEAU

Backend Node/Express para receber inscrições da LP e gravar no Supabase quando as credenciais estiverem configuradas.

## Rodar local

```bash
npm install
copy .env.example .env
npm run dev
```

Abra `http://localhost:3000`.

Sem `DATABASE_URL`, as inscrições ficam em `data/indicacoes.json`.

## Supabase

1. Crie um projeto no Supabase.
2. Em **Settings > API**, copie a URL do projeto e a `service_role` key.
3. Rode o SQL em `supabase/schema.sql` no SQL Editor do Supabase.
3. Preencha no `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
DATABASE_INDICACOES_TABLE=indicacoes
ADMIN_TOKEN=um-token-forte
```

Use `SUPABASE_SERVICE_ROLE_KEY` somente no backend. Nunca a coloque no frontend.

## Rotas

- `GET /api/health`
- `POST /api/indicacoes`
- `GET /api/admin/indicacoes` com header `x-admin-token`
- `GET /api/admin/indicacoes.csv` com header `x-admin-token`
- `PATCH /api/admin/indicacoes/:id/status` com header `x-admin-token`
