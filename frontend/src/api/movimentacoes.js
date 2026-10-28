import client from './client'

// usuarioId/turnoId nunca são enviados: o backend deriva os dois do token
// (Authorization) e do turno aberto do próprio operador (ver
// movimentacaoRoutes.js e movimentacaoService.js).
export async function registrarEntrada({ veiculo, vagaId, telefoneContato }) {
  const { data } = await client.post('/movimentacoes/entrada', { veiculo, vagaId, telefoneContato })
  return data
}

// Preview de "quanto custaria sair agora" — não fecha nada (ver
// movimentacaoService.estimarValor). Usado pra tela de saída mostrar o valor
// antes do operador escolher a forma de pagamento; o valor cobrado de fato é
// sempre recalculado de novo no servidor na hora da confirmação.
export async function estimarValorSaida(movimentacaoId) {
  const { data } = await client.get(`/movimentacoes/${movimentacaoId}/valor-estimado`)
  return data
}

// Nenhum valor cobrado vai no corpo — o servidor recalcula sempre (CLAUDE.md).
// `pagamentos` é uma lista (dinheiro + PIX na mesma saída, por exemplo) cuja
// soma precisa bater com o valor recalculado. `idempotencyKey` é gerado uma
// vez, na abertura da tela de saída (ver SaidaForm.jsx) — reenviar com o
// mesmo token (duplo clique, retry de rede) é rejeitado pelo backend.
export async function registrarSaida(movimentacaoId, { pagamentos, idempotencyKey }) {
  const { data } = await client.post(`/movimentacoes/${movimentacaoId}/saida`, {
    pagamentos,
    idempotencyKey,
  })
  return data
}
