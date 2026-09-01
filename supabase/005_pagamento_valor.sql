-- ============================================================
-- Totem Connect — migração 005: valor no registro de pagamento
-- (facilita o app da maquininha: valor + forma na mesma linha)
-- ============================================================

alter table pagamentos add column if not exists valor numeric(10,2);
alter table pagamentos add column if not exists criado_em timestamptz not null default now();

create index if not exists idx_pagamentos_pendentes
  on pagamentos (status, criado_em)
  where status = 'pendente';
