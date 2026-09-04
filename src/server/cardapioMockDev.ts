import type { CardapioTotem } from '#/lib/tipos'

/**
 * Cardápio de exemplo usado SÓ em `npm run dev` quando o Supabase não está
 * configurado (sem service_role key local). Nunca usado em produção — ver
 * o try/catch em cardapioTotem.ts.
 */
export const cardapioMockDev: CardapioTotem = {
  categorias: [
    { id: 'cat-combos', nome: 'Combos', ordem: 0 },
    { id: 'cat-hamburgueres', nome: 'Hambúrgueres', ordem: 1 },
    { id: 'cat-porcoes', nome: 'Porções', ordem: 2 },
    { id: 'cat-bebidas', nome: 'Bebidas', ordem: 3 },
    { id: 'cat-sobremesas', nome: 'Sobremesas', ordem: 4 },
  ],
  produtos: [
    p('prod-combo-xbacon', 'cat-combos', 'Combo X-Bacon', 'Hambúrguer X-Bacon, batata M e refrigerante', 29.9),
    p('prod-combo-xsalada', 'cat-combos', 'Combo X-Salada', 'Hambúrguer X-Salada, batata M e refrigerante', 25.9),
    p('prod-combo-xtudo', 'cat-combos', 'Combo X-Tudo', 'Hambúrguer X-Tudo, batata M e refrigerante', 27.9),
    p('prod-combo-cheddar', 'cat-combos', 'Combo Cheddar Bacon', 'Cheddar Bacon, batata M e refrigerante', 31.9),
    p('prod-combo-chicken', 'cat-combos', 'Combo Chicken Crispy', 'Chicken Crispy, batata M e refrigerante', 26.9),
    p('prod-combo-veggie', 'cat-combos', 'Combo Veggie', 'Veggie, batata M e refrigerante', 24.9),
    p(
      'prod-xbacon',
      'cat-hamburgueres',
      'X-Bacon',
      'Pão, hambúrguer, queijo, bacon e molho da casa',
      19.9,
      [
        { id: 'add-bacon', nome: '+ Bacon', preco: 4 },
        { id: 'add-queijo', nome: '+ Queijo', preco: 3 },
        { id: 'add-carne', nome: '+ Carne', preco: 8 },
      ],
      ['Padrão', 'Sem cebola', 'Sem tomate', 'Sem picles'],
    ),
    p(
      'prod-xsalada',
      'cat-hamburgueres',
      'X-Salada',
      'Pão, hambúrguer, queijo, alface e tomate',
      17.9,
      [
        { id: 'add-bacon2', nome: '+ Bacon', preco: 4 },
        { id: 'add-queijo2', nome: '+ Queijo', preco: 3 },
      ],
      ['Padrão', 'Sem cebola', 'Sem tomate'],
    ),
    p('prod-xtudo', 'cat-hamburgueres', 'X-Tudo', 'Pão, dois hambúrgueres, queijo, bacon e ovo', 22.9),
    p('prod-batata-p', 'cat-porcoes', 'Batata P', 'Porção pequena de batata frita', 9.9),
    p('prod-batata-m', 'cat-porcoes', 'Batata M', 'Porção média de batata frita', 12),
    p('prod-batata-g', 'cat-porcoes', 'Batata G', 'Porção grande de batata frita', 16),
    p('prod-coca', 'cat-bebidas', 'Coca-Cola 500ml', 'Refrigerante 500ml', 8),
    p('prod-sprite', 'cat-bebidas', 'Sprite 500ml', 'Refrigerante 500ml', 8),
    p('prod-agua', 'cat-bebidas', 'Água 500ml', 'Água mineral sem gás', 5),
    p('prod-petit', 'cat-sobremesas', 'Petit Gateau', 'Bolo quente com sorvete de creme', 14),
    p('prod-milk', 'cat-sobremesas', 'Milkshake', 'Milkshake 400ml', 13),
  ],
}

function p(
  id: string,
  categoriaId: string,
  nome: string,
  descricao: string,
  preco: number,
  adicionais: CardapioTotem['produtos'][number]['adicionais'] = [],
  personalizacoes: string[] = [],
): CardapioTotem['produtos'][number] {
  return {
    id,
    categoriaId,
    nome,
    descricao,
    preco,
    fotoUrl: null,
    disponivel: true,
    adicionais,
    personalizacoes,
  }
}
