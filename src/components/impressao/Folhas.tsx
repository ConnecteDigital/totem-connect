import { formatarBRL } from '#/lib/formato'
import type { PedidoDb } from '#/lib/painel/pedidosDb'

const NOME_ESTABELECIMENTO = 'Hamburgueria Piloto'

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function rotuloConsumo(p: PedidoDb) {
  if (p.tipo_consumo === 'comer_aqui') return 'COMER AQUI'
  if (p.modo_entrega === 'entrega') return 'PARA VIAGEM - ENTREGA'
  return 'PARA VIAGEM - RETIRADA'
}

/** Comanda do cliente (senha + comprovante). */
export function ComandaCliente({ pedido }: { pedido: PedidoDb }) {
  return (
    <div className="folha">
      <div style={{ textAlign: 'center' }}>
        <strong>{NOME_ESTABELECIMENTO}</strong>
        <div>Comprovante do pedido</div>
      </div>
      <hr />
      <div style={{ textAlign: 'center' }}>
        <div>SENHA</div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>#{pedido.numero_pedido}</div>
        {pedido.nome_cliente && <div>{pedido.nome_cliente}</div>}
      </div>
      <hr />
      <div>{rotuloConsumo(pedido)}</div>
      <div>{dataHora(pedido.criado_em)}</div>
      <hr />
      {pedido.pedido_itens.map((it) => (
        <div key={it.id} style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {it.quantidade}x {it.produto_nome}
            </span>
            <span>{formatarBRL(it.preco_unitario * it.quantidade)}</span>
          </div>
          {it.pedido_item_adicionais.map((a) => (
            <div key={a.id}>&nbsp;&nbsp;+ {a.adicional_nome}</div>
          ))}
        </div>
      ))}
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>TOTAL</span>
        <span>{formatarBRL(pedido.valor_total)}</span>
      </div>
      {pedido.forma_pagamento && <div>Pagamento: {pedido.forma_pagamento}</div>}
      <hr />
      <div style={{ textAlign: 'center' }}>Obrigado!</div>
    </div>
  )
}

/** Ticket da cozinha — sem preços, itens grandes, endereço se entrega. */
export function TicketCozinha({ pedido }: { pedido: PedidoDb }) {
  return (
    <div className="folha">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 22 }}>#{pedido.numero_pedido}</strong>
        <span>{dataHora(pedido.criado_em)}</span>
      </div>
      <div style={{ fontWeight: 700 }}>{rotuloConsumo(pedido)}</div>
      {pedido.nome_cliente && <div>Cliente: {pedido.nome_cliente}</div>}
      <hr />

      {pedido.pedido_itens.map((it) => (
        <div key={it.id} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {it.quantidade}x {it.produto_nome}
          </div>
          {it.pedido_item_adicionais.map((a) => (
            <div key={a.id}>&nbsp;&nbsp;+ {a.adicional_nome}</div>
          ))}
          {it.observacoes && <div>&nbsp;&nbsp;* {it.observacoes}</div>}
        </div>
      ))}

      {pedido.modo_entrega === 'entrega' && (
        <>
          <hr />
          <div style={{ fontWeight: 700 }}>ENTREGA</div>
          <div>
            {pedido.entrega_logradouro}, {pedido.entrega_numero}
            {pedido.entrega_complemento ? ` - ${pedido.entrega_complemento}` : ''}
          </div>
          <div>
            {pedido.entrega_bairro} - {pedido.entrega_cidade} - {pedido.entrega_cep}
          </div>
          {pedido.entrega_referencia && <div>Ref: {pedido.entrega_referencia}</div>}
          {pedido.telefone_cliente && <div>Tel: {pedido.telefone_cliente}</div>}
        </>
      )}
    </div>
  )
}
