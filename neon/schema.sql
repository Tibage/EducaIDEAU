create extension if not exists pgcrypto;

create table if not exists indicacoes (
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
  cidade text not null default 'Bagé e Região da Campanha',
  motivo text not null,
  ip_hash text,
  user_agent text,
  constraint indicacoes_status_check check (
    status in ('recebida', 'em_triagem', 'finalista', 'vencedora', 'arquivada')
  ),
  constraint indicacoes_categoria_check check (
    categoria in (
      'Prêmio Sempre Professor(a)',
      'Prêmio Inspiração',
      'Prêmio Inovação',
      'Prêmio Inclusão Social'
    )
  ),
  constraint indicacoes_nome_len_check check (char_length(trim(nome_indicado)) between 3 and 120),
  constraint indicacoes_autor_len_check check (char_length(trim(autor_nome)) between 3 and 120),
  constraint indicacoes_motivo_len_check check (char_length(trim(motivo)) between 40 and 1800),
  constraint indicacoes_email_check check (
    autor_email is null
    or autor_email = ''
    or autor_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index if not exists indicacoes_created_at_idx on indicacoes (created_at desc);
create index if not exists indicacoes_status_idx on indicacoes (status);
create index if not exists indicacoes_categoria_idx on indicacoes (categoria);
create index if not exists indicacoes_cidade_idx on indicacoes (cidade);
create index if not exists indicacoes_busca_idx on indicacoes using gin (
  to_tsvector('portuguese', nome_indicado || ' ' || autor_nome || ' ' || coalesce(instituicao, '') || ' ' || motivo)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists indicacoes_set_updated_at on indicacoes;
create trigger indicacoes_set_updated_at
before update on indicacoes
for each row
execute function set_updated_at();

create or replace view indicacoes_resumo as
select
  categoria,
  status,
  count(*)::int as total
from indicacoes
group by categoria, status
order by categoria, status;
