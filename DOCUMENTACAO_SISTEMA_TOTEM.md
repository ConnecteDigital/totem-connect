# Documentação do Sistema — Totem de Autoatendimento
### Connect Digital · Documento de build para o Claude Code
### Versão 2 — decisões de escopo fechadas em 2026-08-29

Este é o documento definitivo pra iniciar o desenvolvimento. Cobre stack, banco de dados
(Supabase, com SQL pronto), deploy (Vercel), fluxo técnico completo, telas, impressão,
integração com maquininha e o roadmap de implementação.

> **O que mudou da v1 para a v2** (decisões confirmadas com o Gabriel):
> 1. **Pagamento é 100% na maquininha PagBank.** O totem tem uma tela onde o cliente escolhe
>    Pix / crédito / débito; a maquininha executa o fluxo escolhido (no Pix ela gera o QR Code,
>    no cartão ela abre o fluxo com o valor). O sistema só registra o retorno.
> 2. **Login cobre o `/pdv` inteiro** (fila + cadastro de produtos). Só o `/totem` fica sem login.
> 3. **O sistema não contabiliza comissão.** Removido `comissao_percentual` e toda lógica de
>    comissão. Relatórios entrega total de vendas por período + CSV; a porcentagem é acerto
>    externo do Gabriel com o cliente.
> 4. **Numeração de pedido é corrente** (não reseta por dia). Sequência única e crescente por
>    estabelecimento.
> 5. **Cancelamento**: operador do PDV cancela pelo botão → status `cancelado` → sai do
>    faturamento. **Sem estorno automático** na maquininha (se precisar, é manual, fora do sistema).
> 6. **Reimpressão**: PDV tem botão de reimprimir o ticket da cozinha a qualquer momento; o
>    totem tem botão de reimprimir a senha na tela de confirmação se a impressão falhar.

---

## 1. Visão geral

Sistema web (PWA) multi-tela, mesmo domínio, quatro ambientes:

1. **Totem** — cliente monta o pedido e paga (tablet Android 10", horizontal, tema escuro/laranja já validado no Figma). **Sem login.**
2. **PDV** — computador do balcão, gerencia fila de pedidos e imprime pra cozinha. **Com login.**
3. **Relatórios** — faturamento por período. **Com login.**
4. **Cadastro de produtos** — sub-aba dentro do PDV. **Com login (mesmo do PDV).**

Modelo de negócio: sem instalação, sem mensalidade para o primeiro cliente (piloto) — o Gabriel
cobra uma porcentagem sobre o total de vendas, **acordo externo, fora do sistema**. Do segundo
cliente em diante o modelo muda (instalação + mensalidade + eventual porcentagem). O sistema é
multi-tenant desde o schema (cada cliente futuro = um novo `estabelecimento`, sem mudar estrutura).

---

## 2. Stack técnico

| Camada | Tecnologia |
|---|---|
| Frontend | React + TanStack Start |
| Hospedagem | Vercel |
| Banco de dados | Supabase (Postgres + Auth + Realtime + Storage) |
| Tempo real (Totem → PDV) | Supabase Realtime (subscriptions na tabela `pedidos`) |
| Autenticação (PDV + Relatórios) | Supabase Auth |
| Fotos de produtos | Supabase Storage |
| Pagamento no totem | SDK Android nativo (Java/Kotlin) da maquininha PagBank, acionado via bridge JS a partir da WebView do totem |
| Impressão térmica | Agente local (Node) ou WebUSB, um por dispositivo (totem e PDV) |

**Por que Supabase:** já entrega banco relacional + autenticação + realtime + storage de fotos
numa coisa só, sem precisar montar backend próprio do zero — encaixa direto no fluxo de tempo
real Totem→PDV que o projeto precisa.

---

## 3. Banco de dados — schema (Supabase / Postgres)

```sql
create extension if not exists "pgcrypto";

create table estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  maquininha_provedor text,          -- 'pagbank'
  maquininha_device_id text,         -- id do pareamento Bluetooth
  criado_em timestamptz not null default now()
);
-- OBS v2: removido 'comissao_percentual' — o sistema não calcula comissão.

-- estende o auth.users do Supabase com o papel/estabelecimento de cada usuário
create table usuarios (
  id uuid primary key references auth.users(id),
  estabelecimento_id uuid references estabelecimentos(id),
  papel text not null check (papel in ('owner','connect_admin')),
  criado_em timestamptz not null default now()
);

-- v2: dispositivos fixos (totem/PDV) que acessam a API sem login de usuário.
-- Cada totem guarda seu token; a server function valida o token e deriva o estabelecimento.
create table dispositivos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  tipo text not null check (tipo in ('totem','pdv')),
  nome text,                         -- ex: "Totem entrada", "PDV balcão"
  token text not null unique,        -- segredo guardado no dispositivo, enviado a cada request
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  nome text not null,
  ordem int not null default 0
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  categoria_id uuid references categorias(id),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  foto_url text,
  disponivel boolean not null default true,
  ordem int not null default 0
);

create table produto_adicionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) not null,
  nome text not null,               -- ex: "+ Bacon"
  preco numeric(10,2) not null default 0
);

-- v2: numeração corrente POR ESTABELECIMENTO (não reseta por dia).
-- Implementada por contador na própria linha do estabelecimento (ver função abaixo),
-- não por sequence global — senão o número seria compartilhado entre tenants.
create table estabelecimento_contadores (
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

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid references estabelecimentos(id) not null,
  numero_pedido int not null,        -- preenchido via proximo_numero_pedido() na criação
  tipo_consumo text check (tipo_consumo in ('comer_aqui','para_viagem')),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_preparo','pronto','entregue','cancelado')),
  forma_pagamento text check (forma_pagamento in ('pix','cartao_credito','cartao_debito')),
  valor_total numeric(10,2) not null default 0,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  cancelado_em timestamptz
);

create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) not null,
  produto_id uuid references produtos(id),          -- pode virar null se o produto for apagado
  produto_nome text not null,                       -- v2: snapshot do nome no momento do pedido
  quantidade int not null default 1,
  preco_unitario numeric(10,2) not null,            -- snapshot do preço
  observacoes text                                  -- ex: "sem cebola"
);

create table pedido_item_adicionais (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid references pedido_itens(id) not null,
  produto_adicional_id uuid references produto_adicionais(id),
  adicional_nome text not null,                     -- v2: snapshot do nome
  adicional_preco numeric(10,2) not null default 0  -- v2: snapshot do preço
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) not null,
  forma_pagamento text check (forma_pagamento in ('pix','cartao_credito','cartao_debito')),
  status text check (status in ('aprovado','recusado','pendente')),
  transacao_id_maquininha text,
  bandeira text,                     -- opcional, se a maquininha devolver
  respondido_em timestamptz
);

-- índices que mais vão ser usados no dia a dia
create index on pedidos (estabelecimento_id, status, criado_em);
create index on produtos (estabelecimento_id, categoria_id, disponivel);
create index on pedido_itens (pedido_id);
create index on pedido_item_adicionais (pedido_item_id);
```

### Row Level Security (RLS) — base multi-tenant

```sql
alter table produtos enable row level security;
alter table categorias enable row level security;
alter table produto_adicionais enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table pedido_item_adicionais enable row level security;

-- helpers
create or replace function meu_estabelecimento_id()
returns uuid language sql stable as $$
  select estabelecimento_id from usuarios where id = auth.uid()
$$;

create or replace function sou_connect_admin()
returns boolean language sql stable as $$
  select coalesce((select papel from usuarios where id = auth.uid()) = 'connect_admin', false)
$$;

-- produtos / categorias / produto_adicionais: acesso por estabelecimento
create policy "acesso por estabelecimento" on produtos
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

create policy "acesso por estabelecimento" on categorias
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

create policy "acesso por estabelecimento" on produto_adicionais
  for all using (
    produto_id in (select id from produtos
                   where estabelecimento_id = meu_estabelecimento_id())
    or sou_connect_admin()
  );

-- pedidos: acesso por estabelecimento
create policy "acesso por estabelecimento" on pedidos
  for all using (estabelecimento_id = meu_estabelecimento_id() or sou_connect_admin());

-- pedido_itens / pedido_item_adicionais: não têm estabelecimento_id -> join com pedidos
create policy "acesso por estabelecimento" on pedido_itens
  for all using (
    pedido_id in (select id from pedidos
                  where estabelecimento_id = meu_estabelecimento_id())
    or sou_connect_admin()
  );

create policy "acesso por estabelecimento" on pedido_item_adicionais
  for all using (
    pedido_item_id in (
      select pi.id from pedido_itens pi
      join pedidos p on p.id = pi.pedido_id
      where p.estabelecimento_id = meu_estabelecimento_id()
    )
    or sou_connect_admin()
  );
```

> **Totem e PDV e o banco.**
> - O **PDV** e **Relatórios** usam Supabase Auth normalmente; o `estabelecimento_id` sai do
>   usuário logado e a RLS acima protege tudo direto do navegador.
> - O **Totem** não tem login. Ele fala com o banco **só** através de rotas de API (server
>   functions do TanStack Start) que rodam com a **service role key** (nunca exposta no cliente).
>   Cada request do totem manda o `token` do seu registro em `dispositivos`; a server function
>   valida o token, descobre o `estabelecimento_id` e só então lê/escreve. A service role key
>   ignora RLS, então essa checagem de token é a única fronteira — tem que estar em toda rota
>   usada pelo totem.

---

## 4. Fluxo técnico do pedido (o núcleo do sistema)

```
1. Cliente monta o pedido no Totem
   -> carrinho é estado local do app (não grava nada ainda)

2. Cliente toca em "Pagar" e escolhe na tela: Pix, Crédito ou Débito
   -> o Totem chama a server function que:
        - valida o token do dispositivo
        - cria `pedidos` (status = 'aguardando_pagamento', forma_pagamento = a escolhida,
          numero_pedido via proximo_numero_pedido())
        - cria os `pedido_itens` + `pedido_item_adicionais` (com nome/preço snapshot)
        - grava `pagamentos` (status = 'pendente')
   -> a WebView dispara o evento pro wrapper Android nativo (bridge JS), passando VALOR + FORMA
   -> o código nativo chama o SDK da maquininha (Bluetooth):
        - Pix     -> maquininha gera o QR Code na tela dela
        - Crédito -> maquininha abre o fluxo de crédito com o valor
        - Débito  -> maquininha abre o fluxo de débito com o valor
   -> maquininha processa e retorna aprovado/recusado + transacao_id pro nativo, que repassa pro JS

3a. Se RECUSADO / cancelado na maquininha:
   -> server function marca `pagamentos.status = 'recusado'`
   -> pedido continua em 'aguardando_pagamento' (será limpo depois — ver seção 4.1)
   -> totem volta pra tela de pagamento ("tente de novo / escolha outra forma")

3b. Se APROVADO:
   -> server function: `pedidos.status = 'pago'`, `pago_em = now()`,
      `pagamentos.status = 'aprovado'`, grava transacao_id_maquininha
   -> dispara DOIS caminhos em paralelo:
        a) impressão local NO TOTEM -> comanda/senha do cliente
        b) Supabase Realtime notifica o PDV (assinatura na tabela `pedidos`)
             -> pedido entra na fila do PDV
             -> impressão local NO PDV -> ticket da cozinha

4. Operador do PDV move o pedido: 'em_preparo' -> 'pronto' -> 'entregue'
   -> pode cancelar (-> 'cancelado', cancelado_em = now()); sai do faturamento; sem estorno automático
   -> pode reimprimir o ticket da cozinha a qualquer momento
```

**Passo crítico:** a impressão da cozinha só acontece **depois** da confirmação de pagamento —
nunca antes.

### 4.1 Pedidos abandonados

Pedido nasce no banco antes do pagamento. Se a maquininha recusa e o cliente vai embora, sobra
uma linha em `aguardando_pagamento`. Tratamento:

- Job/rotina (cron do Supabase ou checagem na própria API) que marca como `cancelado` todo
  pedido em `aguardando_pagamento` com `criado_em` há mais de ~15 min.
- Relatórios **nunca** somam `aguardando_pagamento` nem `cancelado` (ver seção 8.3).

---

## 5. Totem ↔ PDV — sincronização em tempo real

- **Escrita:** o Totem grava o pedido via API (server function, service role key, token do dispositivo).
- **Leitura em tempo real no PDV:** assinar mudanças na tabela `pedidos` via **Supabase Realtime**,
  filtradas por `estabelecimento_id`. Assim que o status muda, o PDV atualiza sozinho.
- Alternativa mais simples pro MVP se quiser adiar o Realtime: **polling** a cada 3-5s. Funciona
  bem pra um totem só; trocar por Realtime ao escalar (o schema já suporta os dois sem mudança).

---

## 6. As duas impressoras térmicas

| Impressora | Conectada em | Imprime |
|---|---|---|
| Impressora 1 | Tablet do totem (USB) | Comanda/senha do cliente |
| Impressora 2 | Computador do PDV (USB) | Ticket do pedido pra cozinha |

Navegador não acessa impressora térmica ESC/POS diretamente. Solução: **agente de impressão
local** em cada dispositivo — recebe o comando "imprimir pedido X" via WebSocket local
(`localhost`) e manda os bytes ESC/POS pra impressora conectada ali. Pode ser um serviço Node
pequeno (`node-thermal-printer` ou `escpos`), ou testar **WebUSB** direto no navegador do tablet
antes de decidir pelo agente.

Cada dispositivo imprime só o que é dele — o totem nunca tenta imprimir na impressora da cozinha
e vice-versa.

- **Reimpressão no PDV:** botão em `DetalhePedido` reenvia o ticket pro agente local do PDV.
- **Reimpressão no totem:** se o agente/WebUSB retornar erro, a tela `PedidoRealizado` mostra
  um botão "Imprimir senha novamente".

---

## 7. Pagamento — wrapper Android nativo

O SDK da maquininha PagBank não aceita WebView/PWA puro — só Java/Kotlin nativo. Solução:

- App Android nativo fino, contendo uma **WebView** que carrega o PWA do totem normalmente
  (cardápio, carrinho, etc. — tudo igual ao que já foi desenhado).
- Na tela de pagamento, o cliente escolhe **Pix / Crédito / Débito**. O JavaScript chama uma
  função exposta pelo nativo (`addJavascriptInterface`) passando **valor + forma escolhida**.
  O Kotlin/Java aciona o fluxo correspondente no SDK da maquininha e devolve o resultado
  (aprovado/recusado + id da transação + bandeira) de volta pro JS via callback.
- Só essa ponte é nativa — o resto do sistema (PDV, Relatórios, Cadastro) continua 100% web.
- Essa parte só entra em ação quando a maquininha e o terminal de desenvolvimento (DEBUG) da
  PagBank chegarem — não bloqueia o início do desenvolvimento do resto do sistema.

**Contrato da bridge JS ↔ nativo (rascunho a validar com o SDK real):**

```
// JS -> nativo
AndroidPagamento.iniciarPagamento(JSON.stringify({
  pedidoId: "uuid",
  valorCentavos: 4500,
  forma: "pix" | "cartao_credito" | "cartao_debito"
}))

// nativo -> JS  (window.onResultadoPagamento)
{
  pedidoId: "uuid",
  status: "aprovado" | "recusado",
  transacaoId: "string|null",
  bandeira: "string|null",
  mensagemErro: "string|null"
}
```

---

## 8. Telas e principais funções

### 8.1 Totem (sem login)
- `TelaInicial` — estado ocioso, "toque para começar"
- `OndeConsumir` — define `tipo_consumo` (`comer_aqui` / `para_viagem`)
- `Cardapio` — lista produtos por categoria, filtra `disponivel = true`
- `DetalheProduto` — personalização, adicionais, quantidade, observações → carrinho local
- `OfertaCombo` — upsell opcional
- `RevisaoPedido` — mostra carrinho, permite remover item / editar quantidade
- `EscolhaPagamento` — botões Pix / Crédito / Débito
- `Pagamento` — cria o `pedido` + itens no banco (via API), dispara o wrapper nativo, aguarda retorno
- `PedidoRealizado` — confirmação + nº do pedido + trigger de impressão local (+ botão reimprimir)

### 8.2 PDV (com login)
- `Login` — Supabase Auth (e-mail/senha)
- `FilaPedidos` — assina Realtime (ou polling), mostra por status (novo / em preparo / pronto)
- `DetalhePedido` — muda status (`em_preparo` → `pronto` → `entregue`), cancela, reimprime ticket
- `CadastroProdutos` (sub-aba) — CRUD de produtos/categorias/adicionais, upload de foto
  (Supabase Storage), toggle de disponibilidade, ordenação

### 8.3 Relatórios (com login)
- `Login` — Supabase Auth (mesmo usuário do PDV serve)
- `Faturamento` — filtro por período (dia / semana / mês / personalizado):
  - Resumo: nº de pedidos, **valor total vendido**, ticket médio
  - Lista de pedidos do período: nº, data/hora, itens, valor, forma de pagamento, status
  - Só conta `status in ('pago','em_preparo','pronto','entregue')` — ignora `cancelado` e
    `aguardando_pagamento`
- `ExportarCSV` — exporta a lista do período (pra o Gabriel fazer o acerto de porcentagem por fora)

---

## 9. Autenticação e permissões

- **Totem:** sem login. Acesso ao banco só via server functions com service role key +
  validação do `token` do dispositivo (tabela `dispositivos`).
- **PDV + Relatórios + Cadastro de produtos:** login por e-mail/senha (Supabase Auth).
  Papel `owner` só vê o próprio estabelecimento (via RLS); papel `connect_admin` (Gabriel)
  vê todos.
- Onboarding de um novo estabelecimento (feito pelo Gabriel / `connect_admin`):
  cria `estabelecimentos`, cria o usuário `owner` no Auth + linha em `usuarios`,
  cria os registros em `dispositivos` (1 totem + 1 pdv) e entrega os tokens.

---

## 10. Deploy — Vercel

- Projeto TanStack Start conectado ao repositório GitHub, deploy automático a cada push.
- Variáveis de ambiente na Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` — usada no client (PDV / Relatórios / Cadastro, com RLS)
  - `SUPABASE_SERVICE_ROLE_KEY` — usada **só** nas server functions (Totem), nunca exposta no
    navegador. Conferir que não tem prefixo público (`VITE_`, `PUBLIC_`) e que só é importada
    em módulos server-only.
- Domínio único servindo as rotas (`/totem`, `/pdv`, `/pdv/cadastro`, `/relatorios`) — já
  pensado pra multi-tenant: adicionar um novo estabelecimento não exige novo deploy, só novos
  registros no banco.

---

## 11. Não-funcionais / pensado pra escalar

- Todo dado nasce com `estabelecimento_id` — trocar de 1 para N clientes não muda o schema,
  só multiplica o cadastro.
- Cardápio, categorias e adicionais são por estabelecimento — cada cliente futuro terá cadastro
  independente.
- Impressão e maquininha são sempre por dispositivo local, nunca centralizadas — já compatível
  com vários totens rodando ao mesmo tempo.
- Numeração de pedido é por estabelecimento (contador dedicado), corrente, sem reset.
- O sistema não faz billing/comissão — modelo comercial é tratado fora do sistema (por ora).

---

## 12. Roadmap de implementação

**Fase 1 — Sistema web completo (pode começar já)**
- [ ] Criar projeto no Supabase e rodar o schema v2 (seção 3)
- [ ] Configurar projeto TanStack Start + deploy inicial na Vercel (seção 10)
- [ ] Construir as telas (seção 8) com dados mockados
- [ ] Ligar as telas ao Supabase:
  - [ ] Auth + RLS no PDV / Relatórios / Cadastro
  - [ ] CRUD de produtos/categorias/adicionais + upload de foto
  - [ ] server functions do Totem (criação de pedido, com validação de token de dispositivo)
  - [ ] rotina de limpeza de pedidos abandonados
- [ ] Implementar Realtime (ou polling) entre Totem e PDV
- [ ] Tela de Relatórios + exportação CSV

**Fase 2 — Impressão**
- [ ] Testar WebUSB no tablet Android escolhido
- [ ] Se não for viável, montar o agente de impressão local (Node) pro totem e pro PDV
- [ ] Layout ESC/POS da senha do cliente e do ticket da cozinha
- [ ] Botões de reimpressão (PDV e totem)

**Fase 3 — Pagamento (entra quando a maquininha/terminal DEBUG chegar)**
- [ ] Montar o wrapper Android nativo (seção 7)
- [ ] Fechar o contrato real da bridge JS ↔ nativo com o SDK PagBank
- [ ] Integrar SDK PagBank em ambiente sandbox (Pix + crédito + débito)
- [ ] Abrir e concluir a homologação
- [ ] Testar fluxo completo de ponta a ponta na hamburgueria (piloto)
