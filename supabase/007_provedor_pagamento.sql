-- ============================================================
-- Totem Connect — migração 007: provedor de pagamento (Cielo Smart / Stone)
-- Guarda, por pagamento, qual provedor cobrou e o id do pedido lá (Order Manager da Cielo).
-- ============================================================

alter table pagamentos add column if not exists provedor text;
alter table pagamentos add column if not exists provedor_pedido_id text;
