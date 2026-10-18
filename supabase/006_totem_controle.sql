-- ============================================================
-- Totem Connect — migração 006: controle remoto do tablet do totem
-- (botão ligar/desligar tela no PDV + sinal de vida/bateria do tablet)
-- ============================================================

alter table dispositivos
  add column if not exists tela_desejada text not null default 'ligada'
    check (tela_desejada in ('ligada', 'desligada')),
  add column if not exists ultimo_sinal_em timestamptz,
  add column if not exists bateria_pct int,
  add column if not exists carregando boolean,
  add column if not exists tela_atual text,
  add column if not exists versao_app text;

-- O PDV (browser, logado) nunca lê `dispositivos` direto (tem token).
-- Estas duas funções expõem só o necessário, restrito ao estabelecimento do usuário.

create or replace function estado_totem()
returns table (
  nome text,
  tela_desejada text,
  tela_atual text,
  ultimo_sinal_em timestamptz,
  bateria_pct int,
  carregando boolean
)
language sql stable security definer set search_path = public as $$
  select d.nome, d.tela_desejada, d.tela_atual, d.ultimo_sinal_em, d.bateria_pct, d.carregando
  from dispositivos d
  where d.tipo = 'totem' and d.ativo
    and d.estabelecimento_id = meu_estabelecimento_id()
  order by d.criado_em
  limit 1
$$;

create or replace function definir_tela_totem(p_estado text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_estado not in ('ligada', 'desligada') then
    raise exception 'estado inválido';
  end if;
  update dispositivos
     set tela_desejada = p_estado
   where tipo = 'totem' and ativo
     and estabelecimento_id = meu_estabelecimento_id();
end
$$;

grant execute on function estado_totem() to authenticated;
grant execute on function definir_tela_totem(text) to authenticated;
