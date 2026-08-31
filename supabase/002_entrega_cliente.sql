-- ============================================================
-- Totem Connect — migração 002: nome do cliente + entrega
-- Rodar no SQL Editor do Supabase (depois do schema.sql).
-- ============================================================

alter table pedidos add column if not exists nome_cliente text;
alter table pedidos add column if not exists telefone_cliente text;

-- só usado quando tipo_consumo = 'para_viagem'
alter table pedidos add column if not exists modo_entrega text
  check (modo_entrega in ('retirada', 'entrega'));

-- endereço (só quando modo_entrega = 'entrega')
alter table pedidos add column if not exists entrega_cep text;
alter table pedidos add column if not exists entrega_logradouro text;
alter table pedidos add column if not exists entrega_numero text;
alter table pedidos add column if not exists entrega_complemento text;
alter table pedidos add column if not exists entrega_bairro text;
alter table pedidos add column if not exists entrega_cidade text;
alter table pedidos add column if not exists entrega_referencia text;
alter table pedidos add column if not exists taxa_entrega numeric(10,2) not null default 0;
