-- ============================================================
-- Totem Connect — migração 003: personalizações do produto
-- Ex: ["Padrão", "Sem cebola", "Sem tomate"]
-- ============================================================

alter table produtos
  add column if not exists personalizacoes text[] not null default '{}';
