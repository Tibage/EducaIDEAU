# Backend do Prêmio IDEAU

Backend Node/Express para receber inscrições da LP e gravar no Neon/PostgreSQL quando `DATABASE_URL` estiver configurado.

## Rodar local

```bash
npm install
copy .env.example .env
npm run dev
```

Abra `http://localhost:3000`.

Sem `DATABASE_URL`, as inscrições ficam em `data/indicacoes.json`.

## Neon

1. Crie um projeto no Neon.
2. Copie a connection string do banco.
3. Rode o SQL em `neon/schema.sql` no SQL Editor do Neon.
3. Preencha no `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@host.neon.tech/database?sslmode=require
DATABASE_INDICACOES_TABLE=indicacoes
ADMIN_TOKEN=um-token-forte
```

Use a `DATABASE_URL` somente no backend. Nunca coloque essa string no frontend.

## Rotas

- `GET /api/health`
- `POST /api/indicacoes`
- `GET /api/admin/indicacoes` com header `x-admin-token`
- `GET /api/admin/indicacoes.csv` com header `x-admin-token`
- `PATCH /api/admin/indicacoes/:id/status` com header `x-admin-token`
