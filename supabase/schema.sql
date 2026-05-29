create extension if not exists pgcrypto;

create table if not exists public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'recebida',
  nome_indicado text not null,
  categoria text not null,
  autor_nome text not null,
  autor_email text,
  autor_telefone text,
  instituicao text,
  cidade text,
  motivo text not null,
  ip_hash text,
  user_agent text,
  constraint indicacoes_status_check check (
    status in ('recebida', 'em_triagem', 'finalista', 'vencedora', 'arquivada')
  ),
  constraint indicacoes_categoria_check check (
    categoria in (
      'Legado Educacional',
      'Mestre do Engajamento',
      'Tecnologia com Propósito',
      'Impacto Social e Inclusão'
    )
  )
);

create index if not exists indicacoes_created_at_idx on public.indicacoes (created_at desc);
create index if not exists indicacoes_status_idx on public.indicacoes (status);
create index if not exists indicacoes_categoria_idx on public.indicacoes (categoria);

alter table public.indicacoes enable row level security;

drop policy if exists "Sem leitura publica de indicacoes" on public.indicacoes;
drop policy if exists "Sem escrita publica direta de indicacoes" on public.indicacoes;

create policy "Sem leitura publica de indicacoes"
on public.indicacoes
for select
to anon, authenticated
using (false);

create policy "Sem escrita publica direta de indicacoes"
on public.indicacoes
for insert
to anon, authenticated
with check (false);
