-- ============================================================
-- Totem Connect — seed (dados do piloto: hamburgueria)
-- Rodar DEPOIS do schema.sql, no SQL Editor do Supabase.
-- ============================================================

-- Estabelecimento do piloto (UUID fixo pra facilitar config do app)
insert into estabelecimentos (id, nome, maquininha_provedor)
values ('11111111-1111-1111-1111-111111111111', 'Hamburgueria Piloto', 'pagbank')
on conflict (id) do nothing;

insert into estabelecimento_contadores (estabelecimento_id, proximo_numero_pedido)
values ('11111111-1111-1111-1111-111111111111', 1)
on conflict (estabelecimento_id) do nothing;

-- Dispositivos — TROQUE os tokens antes de ir pra produção
insert into dispositivos (estabelecimento_id, tipo, nome, token) values
  ('11111111-1111-1111-1111-111111111111', 'totem', 'Totem 1',    'tok_totem_piloto_TROQUE_ISTO'),
  ('11111111-1111-1111-1111-111111111111', 'pdv',   'PDV Balcão',  'tok_pdv_piloto_TROQUE_ISTO')
on conflict (token) do nothing;

-- Categorias
insert into categorias (estabelecimento_id, nome, ordem) values
  ('11111111-1111-1111-1111-111111111111', 'Combos',       0),
  ('11111111-1111-1111-1111-111111111111', 'Hambúrgueres', 1),
  ('11111111-1111-1111-1111-111111111111', 'Porções',      2),
  ('11111111-1111-1111-1111-111111111111', 'Bebidas',      3),
  ('11111111-1111-1111-1111-111111111111', 'Sobremesas',   4)
on conflict do nothing;

-- Produtos (linka pela categoria via nome)
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, disponivel, ordem)
select '11111111-1111-1111-1111-111111111111', c.id, p.nome, p.descricao, p.preco, true, p.ordem
from categorias c
join (values
  ('Combos',       'Combo X-Bacon',   'Hambúrguer X-Bacon, batata M e refrigerante', 29.90, 0),
  ('Combos',       'Combo X-Salada',  'Hambúrguer X-Salada, batata M e refrigerante', 25.90, 1),
  ('Combos',       'Combo X-Tudo',    'Hambúrguer X-Tudo, batata M e refrigerante',   27.90, 2),
  ('Combos',       'Combo Cheddar Bacon', 'Cheddar Bacon, batata M e refrigerante',   31.90, 3),
  ('Combos',       'Combo Chicken Crispy','Chicken Crispy, batata M e refrigerante',  26.90, 4),
  ('Combos',       'Combo Veggie',    'Veggie, batata M e refrigerante',              24.90, 5),
  ('Hambúrgueres', 'X-Bacon',         'Pão, hambúrguer, queijo, bacon e molho',       19.90, 0),
  ('Hambúrgueres', 'X-Salada',        'Pão, hambúrguer, queijo, alface e tomate',     17.90, 1),
  ('Hambúrgueres', 'X-Tudo',          'Pão, dois hambúrgueres, queijo, bacon, ovo',   22.90, 2),
  ('Porções',      'Batata P',        'Porção pequena de batata frita',                9.90, 0),
  ('Porções',      'Batata M',        'Porção média de batata frita',                12.00, 1),
  ('Porções',      'Batata G',        'Porção grande de batata frita',               16.00, 2),
  ('Bebidas',      'Coca-Cola 500ml', 'Refrigerante lata/garrafa 500ml',               8.00, 0),
  ('Bebidas',      'Sprite 500ml',    'Refrigerante 500ml',                            8.00, 1),
  ('Bebidas',      'Água 500ml',      'Água mineral sem gás',                          5.00, 2),
  ('Sobremesas',   'Petit Gateau',    'Bolo quente com sorvete',                      14.00, 0),
  ('Sobremesas',   'Milkshake',       'Milkshake 400ml',                              13.00, 1)
) as p(cat, nome, descricao, preco, ordem) on p.cat = c.nome
where c.estabelecimento_id = '11111111-1111-1111-1111-111111111111'
on conflict do nothing;

-- Adicionais para os hambúrgueres
insert into produto_adicionais (produto_id, nome, preco)
select pr.id, a.nome, a.preco
from produtos pr
join (values ('+ Bacon', 4.00), ('+ Queijo', 3.00), ('+ Carne', 8.00)) as a(nome, preco) on true
where pr.estabelecimento_id = '11111111-1111-1111-1111-111111111111'
  and pr.nome in ('X-Bacon', 'X-Salada', 'X-Tudo')
on conflict do nothing;

-- ------------------------------------------------------------
-- Usuário admin (Gabriel) — rodar SÓ depois de criar o usuário
-- em Authentication > Users. Pegue o UUID dele e cole abaixo:
-- ------------------------------------------------------------
-- insert into usuarios (id, estabelecimento_id, papel)
-- values ('COLE_AQUI_O_UUID_DO_AUTH', '11111111-1111-1111-1111-111111111111', 'connect_admin')
-- on conflict (id) do update set estabelecimento_id = excluded.estabelecimento_id, papel = excluded.papel;
