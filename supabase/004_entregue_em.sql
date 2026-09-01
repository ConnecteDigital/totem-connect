-- ============================================================
-- Totem Connect — migração 004: marca de quando o pedido foi entregue
-- ============================================================

alter table pedidos add column if not exists entregue_em timestamptz;
