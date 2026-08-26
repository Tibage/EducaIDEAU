alter table indicacoes drop constraint if exists indicacoes_motivo_len_check;
alter table indicacoes add constraint indicacoes_motivo_len_check
  check (char_length(trim(motivo)) <= 1800);
