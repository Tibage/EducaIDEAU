# Backend do Prêmio IDEAU

Backend Node/Express para receber indicações da LP e gravar no Supabase quando as credenciais estiverem configuradas.

## Rodar local

```bash
npm install
copy .env.example .env
npm run dev
```

Abra `http://localhost:3000`.

Sem Supabase configurado, as indicações ficam em `data/indicacoes.json`.

## Supabase

1. Crie um projeto no Supabase.
2. Rode o SQL em `supabase/schema.sql`.
3. Preencha no `.env`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_INDICACOES_TABLE=indicacoes
ADMIN_TOKEN=um-token-forte
```

Use a `service_role_key` somente no backend. Nunca coloque essa chave no frontend.

## Rotas

- `GET /api/health`
- `POST /api/indicacoes`
- `GET /api/admin/indicacoes` com header `x-admin-token`
- `GET /api/admin/indicacoes.csv` com header `x-admin-token`
- `PATCH /api/admin/indicacoes/:id/status` com header `x-admin-token`
