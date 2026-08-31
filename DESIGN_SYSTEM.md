# Design System — Totem Connect
### Base visual do projeto (Totem, PDV, Relatórios). Refinar tela a tela durante o build.

> Extraído do "FLUXO DE TELAS – TOTEM" + tela inicial refinada (Connect Digital), 2026-08-29.
> Regra geral: **preto com laranja, botões grandes e chamativos, ações primárias sempre em laranja.**

---

## 1. Cores

| Token | Hex | Uso |
|---|---|---|
| `--cor-laranja` | `#FF6A00` | ação primária, destaque, marca (confirmar hex exato no Figma) |
| `--cor-preto` | `#111111` | fundo principal do totem, texto sobre claro |
| `--cor-cinza-claro` | `#F5F5F5` | fundo de cards em tela clara (PDV/Relatórios) |
| `--cor-cinza-medio` | `#E5E5E5` | bordas, divisores, estados desabilitados |
| `--cor-branco` | `#FFFFFF` | texto sobre fundo escuro, fundo de PDV/Relatórios |

- **Totem:** tema escuro — fundo `#111111`, texto branco, laranja nos CTAs e preços.
- **PDV / Relatórios:** tema claro — fundo branco/cinza-claro, laranja só em ação primária e status.
- Card de produto no totem: fundo um tom acima do preto (ex: `#1C1C1C` / `#222`), a confirmar.

## 2. Tipografia

| Estilo | Peso / tamanho / linha | Uso |
|---|---|---|
| Título | Bold — 24 / 28 | títulos de tela ("Onde você vai consumir?") |
| Subtítulo | Semibold — 18 / 22 | seções, nome de produto no card |
| Corpo | Regular — 14 / 18 | descrições, textos de apoio |
| Preço / Destaque | Bold — 20 / 24 | preços, valores, número do pedido |

Fonte: a definir (sem-serifa geométrica tipo Inter / Manrope até vir a do Figma). Escalar os
tamanhos pra cima no totem (tela grande + distância de leitura) — os valores acima são a
proporção; no totem o Título pode ir a 32–40.

## 3. Botões

| Nível | Estilo | Quando |
|---|---|---|
| Primário | Preenchido laranja, cantos bem arredondados (pill), texto branco bold, **grande** | ação principal da tela (1 por tela): "Adicionar ao pedido", "Finalizar pedido", "Toque para começar" |
| Secundário | Contorno (borda cinza/branca), fundo transparente | ação alternativa: "+ Adicionar mais itens", "Continuar sem combo" |
| Terciário | Só texto | ações de baixa ênfase: "Voltar" |

- Altura mínima de toque no totem: **≥ 64 px** (alvos grandes, dedo).
- Botão primário de tela cheia (ex: `TOQUE PARA COMEÇAR`, `Finalizar pedido`) ocupa a
  largura toda da área de conteúdo / faixa inferior.

## 4. Ícones

Set em uso: início (home), carrinho, círculo/adicionar, lixeira (remover), mais (+), menos (−),
cartão, losango (Pix), sacola (para viagem), banqueta (comer aqui).
Estilo: linha, traço médio, cantos suaves. **Tamanho grande** — no totem os ícones de ação
(carrinho, +/−, comer aqui / para viagem) precisam ser bem visíveis, não miniatura.

## 5. Padrões de layout — Totem (tablet 10" horizontal)

### Elementos recorrentes
- **Cabeçalho:** logo Connect pequena no canto superior esquerdo + seletor de idioma
  ("Português ▾") no canto superior direito. Presente da 2ª tela em diante.
- **Painel "Meu pedido" (carrinho lateral direito):** faixa escura fixa à direita, recolhível
  (chevron ▲/▼), com badge de quantidade no ícone do carrinho. Lista cada item com
  miniatura, nome, preço, stepper (− N +) e lixeira; ao final "Total R$ X,XX" em destaque e
  botão primário laranja largo **"Ver pedido →"**. Aparece de "Onde consumir" até a revisão.
  Some no Pagamento / Pedido realizado.
- **Rodapé:** "‹ Voltar" no canto inferior esquerdo (todas as telas menos a inicial). Faixa
  de destaque/promo opcional acima do rodapé (ex: "Monte seu combo e economize!").

### Tela a tela
- **Tela inicial:** logo da Connect **pequena, no canto**; o nome/marca da hamburgueria é o
  destaque central. "TOQUE PARA COMEÇAR" **grande, ocupando a faixa inferior inteira**, com
  ícone de toque grande. Seletor de idioma no canto. "Precisa de ajuda?" discreto no rodapé.
  Metade da tela é imagem do produto (full-bleed). Sem carrinho lateral aqui.
- **Onde vai consumir:** título grande centralizado ("Onde você vai **consumir?**" — 2ª linha
  em laranja, sublinhado laranja curto), texto de apoio com seta emoji. Dois **cards claros
  grandes lado a lado**: "Comer aqui" / "Para viagem", cada um com ícone laranja grande
  (banqueta / sacola), título, subtítulo e **botão circular laranja com seta** no rodapé do
  card. Carrinho lateral já visível à direita.
- **Cardápio:** título "Cardápio" + subtítulo no topo esquerdo; **campo de busca** "Buscar
  produtos" no topo. **Categorias na coluna da esquerda** (rail vertical fixo, estilo Bob's) —
  Combos, Hambúrgueres, Porções, Bebidas, Sobremesas, cada uma com ícone; ativa = laranja
  preenchida, demais = contorno claro. Centro: grade de cards (foto, nome, **preço em
  laranja**, botão "Adicionar" laranja largo com ícone +). Carrinho lateral à direita.
  Faixa promo do combo acima do rodapé.
  > Diverge do mockup (que põe as categorias como pills no topo). Decisão do Gabriel: rail à
  > esquerda. Layout final em 3 colunas no landscape: rail | grade | carrinho.
- **Detalhe do produto:** foto grande à esquerda; à direita nome, preço, opções ("Escolha
  como deseja": Padrão / Sem cebola / Sem tomate — chips selecionáveis), adicionais com preço
  e checkbox, stepper de quantidade (− N +), botão primário "Adicionar ao pedido" full-width.
- **Revisão do pedido:** lista de itens com miniatura, nome, preço e lixeira; linha "Total"
  em destaque; rodapé com "+ Adicionar mais itens" (secundário) e "Finalizar pedido" (primário).
- **Pagamento:** "Como deseja pagar?" + 2 opções grandes lado a lado: **Cartão** e **Pix**
  (cartão cobre crédito e débito — a maquininha resolve). Texto de apoio: "Insira ou aproxime
  o cartão na maquininha ao lado." Ilustração da maquininha.
  > Ajuste vs. schema: no totem o cliente escolhe **Cartão** ou **Pix**; se Cartão, a
  > maquininha oferece crédito/débito. O `forma_pagamento` final vem do retorno da maquininha.
- **Pedido realizado:** check verde grande, "Pedido #124", "Pagamento aprovado!", instrução
  "Retire seu comprovante abaixo." Botão "Imprimir novamente" aparece só se a impressão falhar.
- Navegação: sempre um "Voltar" no topo esquerdo (exceto tela inicial). Fluxo linear, 1 ação
  principal por tela.

## 6. Padrões de layout — PDV / Relatórios (desktop, tema claro)

- Tema claro, mesma paleta (laranja = primário/atalho), tipografia igual.
- PDV: colunas por status (Novo / Em preparo / Pronto), cards de pedido grandes, clique abre
  detalhe. Botões de status e "Reimprimir" visíveis no card/detalhe.
- Relatórios: filtro de período no topo, cards de resumo (nº pedidos, total vendido, ticket
  médio), tabela de pedidos, botão "Exportar CSV".

## 7. Como aplicar no código

- Tokens viram CSS custom properties (`:root`) + tema (`[data-tema="escuro"]` no totem,
  claro no PDV). Nada de hex solto nos componentes.
- Componentes base compartilhados: `Botao` (primário/secundário/terciário), `BotaoCircular`
  (seta), `Card`, `CardOpcao` (comer aqui / para viagem), `Stepper`, `Chip`, `IconeAcao`,
  `CabecalhoTotem` (logo + idioma), `CarrinhoLateral` (painel "Meu pedido" recolhível),
  `RailCategorias`, `CampoBusca`, `FaixaPromo`, `RodapeVoltar`.
- Refinar cada tela contra este doc na hora de construí-la; divergências que a gente decidir
  no caminho voltam pra cá.
