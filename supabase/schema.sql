-- ============================================================
-- Totem Connect — schema v2
-- Rodar no Supabase: SQL Editor > New query > colar tudo > Run
-- Pode rodar mais de uma vez (é idempotente no que dá).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Estabelecimentos e usuários
-- ------------------------------------------------------------
create table if not exists estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  maquininha_provedor text,          -- 'pagbank'
  maquininha_device_id text,         -- id do pareamento Bluetooth
  criado_em timestamptz not null default now()
);

-- estende auth.users com papel/estabelecimento
create table if not exists usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  estabelecimento_id uuid references estabelecimentos(id),
  papel text not null check (papel in ('owner','connect_admin')),
  criado_em timestamptz not null default now()
);

-- dispositivos fixos (totem/pdv) que acessam a API sem login de usuário
create table if not exists dispositivos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  tipo text not null check (tipo in ('totem','pdv')),
  nome text,
  token text not null unique,        -- segredo guardado no dispositivo
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Cardápio
-- ------------------------------------------------------------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  nome text not null,
  ordem int not null default 0
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  foto_url text,
  disponivel boolean not null default true,
  ordem int not null default 0
);

create table if not exists produto_adicionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete cascade not null,
  nome text not null,                -- ex: "+ Bacon"
  preco numeric(10,2) not null default 0
);

-- ------------------------------------------------------------
-- 3. Numeração de pedido — corrente, por estabelecimento
-- ------------------------------------------------------------
create table if not exists estabelecimento_contadores (
  estabelecimento_id uuid primary key references estabelecimentos(id),
  proximo_numero_pedido int not null default 1
);

create or replace function proximo_numero_pedido(p_estabelecimento_id uuid)
returns int
language plpgsql
as $$
declare
  v_numero int;
begin
  insert into estabelecimento_contadores (estabelecimento_id, proximo_numero_pedido)
    values (p_estabelecimento_id, 1)
    on conflict (estabelecimento_id) do nothing;

  update estabelecimento_contadores
     set proximo_numero_pedido = proximo_numero_pedido + 1
   where estabelecimento_id = p_estabelecimento_id
   returning proximo_numero_pedido - 1 into v_numero;

  return v_numero;
end;
$$;

-- ------------------------------------------------------------
-- 4. Pedidos
-- ------------------------------------------------------------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  numero_pedido int not null,        -- preenchido via proximo_numero_pedido()
  tipo_consumo text check (tipo_consumo in ('comer_aqui','para_viagem')),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_preparo','pronto','entregue','cancelado')),
  forma_pagamento text check (forma_pagamento in ('pix','cartao_credito','cartao_debito')),
  valor_total numeric(10,2) not null default 0,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  cancelado_em timestamptz
);

create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade not null,
  produto_id uuid references produtos(id) on delete set null,
  produto_nome text not null,                    -- snapshot
  quantidade int not null default 1,
  preco_unitario numeric(10,2) not null,         -- snapshot
  observacoes text
);

create table if not exists pedido_item_adicionais (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid references pedido_itens(id) on delete cascade not null,
  produto_adicional_id uuid references produto_adicionais(id) on delete set null,
  adicional_nome text not null,                  -- snapshot
  adicional_preco numeric(10,2) not null default 0
);

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade not null,
  forma_pagamento text check (forma_pagamento in ('pix','cartao_credito','cartao_debito')),
  status text check (status in ('aprovado','recusado','pendente')),
  transacao_id_maquininha text,
  bandeira text,
  respondido_em timestamptz
);

-- ------------------------------------------------------------
-- 5. Índices
-- ------------------------------------------------------------
create index if not exists idx_pedidos_estab_status_data on pedidos (estabelecimento_id, status, criado_em);
create index if not exists idx_produtos_estab_cat_disp on produtos (estabelecimento_id, categoria_id, disponivel);
create index if not exists idx_pedido_itens_pedido on pedido_itens (pedido_id);
create index if not exists idx_pedido_item_adic_item on pedido_item_adicionais (pedido_item_id);

-- ------------------------------------------------------------
-- 6. Helpers de RLS
--    security definer: rodam com privilégio do dono, então conseguem
--    ler `usuarios` mesmo com RLS ligado nela.
-- ------------------------------------------------------------
create or replace function meu_estabelecimento_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select estabelecimento_id from usuarios where id = auth.uid()
$$;

create or replace function sou_connect_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel from usuarios where id = auth.uid()) = 'connect_admin', false)
$$;

-- ------------------------------------------------------------
-- 7. RLS  (Totem usa service role e ignora isto; PDV/Relatórios usam login)
--    Habilitado em TODAS as tabelas do app. As que não têm policy
--    (estabelecimento_contadores) ficam inacessíveis pelo browser —
--    só a service role, que ignora RLS, mexe nelas.
-- ------------------------------------------------------------
alter table estabelecimentos           enable row level security;
alter table usuarios                   enable row level security;
alter table dispositivos               enable row level security;
alter table estabelecimento_contadores enable row level security;
alter table categorias                 enable row level security;
alter table produtos                   enable row level security;
alter table produto_adicionais         enable row level security;
alter table pedidos                    enable row level security;
alter table pedido_itens               enable row level security;
alter table pedido_item_adicionais     enable row level security;
alter table pagamentos                 enable row level security;

-- estabelecimentos: vê o próprio; admin vê todos
drop policy if exists "estab visivel" on estabelecimentos;
create policy "estab visivel" on estabelecimentos
  for select using (id = meu_estabelecimento_id() or sou_connect_admin());

-- usuarios: cada um enxerga a própria linha; admin enxerga todas
drop policy if exists "usuario ve a si" on usuarios;
create policy "usuario ve a si" on usuarios
  for select using (id = auth.uid() or sou_connect_admin());

-- dispositivos: NUNCA pelo browser anon (tem token). Só admin.
drop policy if exists "dispositivos so admin" on dispositivos;
create policy "dispositivos so admin" on dispositivos
  for all using (sou_connect_admin());

-- estabelecimento_contadores: sem policy de propósito (só service role)

drop policy if exists "acesso por estabelecimento" on produtos;
create policy "acesso por estabelecimento" on produtos
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

drop policy if exists "acesso por estabelecimento" on categorias;
create policy "acesso por estabelecimento" on categorias
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

drop policy if exists "acesso por estabelecimento" on produto_adicionais;
create policy "acesso por estabelecimento" on produto_adicionais
  for all using (
    produto_id in (select id from produtos where estabelecimento_id = meu_estabelecimento_id())
    or sou_connect_admin()
  );

drop policy if exists "acesso por estabelecimento" on pedidos;
create policy "acesso por estabelecimento" on pedidos
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

drop policy if exists "acesso por estabelecimento" on pedido_itens;
create policy "acesso por estabelecimento" on pedido_itens
  for all using (
    pedido_id in (select id from pedidos where estabelecimento_id = meu_estabelecimento_id())
    or sou_connect_admin()
  );

drop policy if exists "acesso por estabelecimento" on pedido_item_adicionais;
create policy "acesso por estabelecimento" on pedido_item_adicionais
  for all using (
    pedido_item_id in (
      select pi.id from pedido_itens pi
      join pedidos p on p.id = pi.pedido_id
      where p.estabelecimento_id = meu_estabelecimento_id()
    )
    or sou_connect_admin()
  );

-- pagamentos: via join com pedidos
drop policy if exists "acesso por estabelecimento" on pagamentos;
create policy "acesso por estabelecimento" on pagamentos
  for all using (
    pedido_id in (select id from pedidos where estabelecimento_id = meu_estabelecimento_id())
    or sou_connect_admin()
  );

-- ------------------------------------------------------------
-- 8. Realtime — PDV assina mudanças em pedidos
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table pedidos;
  exception when duplicate_object then null;
  end;
end $$;

-- ------------------------------------------------------------
-- 9. Limpeza de pedidos abandonados
-- ------------------------------------------------------------
create or replace function cancelar_pedidos_abandonados()
returns void language sql as $$
  update pedidos
     set status = 'cancelado', cancelado_em = now()
   where status = 'aguardando_pagamento'
     and criado_em < now() - interval '15 minutes';
$$;

-- Opcional: agendar de 5 em 5 min (precisa da extensão pg_cron habilitada em Database > Extensions)
-- select cron.schedule('cancela-abandonados', '*/5 * * * *', $$select cancelar_pedidos_abandonados()$$);

-- ------------------------------------------------------------
-- 10. Storage — bucket público de fotos de produto
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "fotos produto - leitura publica" on storage.objects;
create policy "fotos produto - leitura publica" on storage.objects
  for select using (bucket_id = 'produtos');

drop policy if exists "fotos produto - escrita autenticada" on storage.objects;
create policy "fotos produto - escrita autenticada" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos');

drop policy if exists "fotos produto - update autenticado" on storage.objects;
create policy "fotos produto - update autenticado" on storage.objects
  for update to authenticated using (bucket_id = 'produtos');

drop policy if exists "fotos produto - delete autenticado" on storage.objects;
create policy "fotos produto - delete autenticado" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos');
