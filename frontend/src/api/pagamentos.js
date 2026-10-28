import client from './client'

export async function listarPagamentosPorMovimentacao(movimentacaoId) {
  const { data } = await client.get(`/pagamentos/movimentacao/${movimentacaoId}`)
  return data
}

// Estorno nunca é DELETE (CLAUDE.md) — cria um pagamento novo, negativo por
// dedução (estorno_de_id aponta pro original), com motivo e autor exigidos
// pelo backend (ver pagamentoService.estornar). Exige perfil admin.
export async function estornarPagamento(id, motivo) {
  const { data } = await client.post(`/pagamentos/${id}/estornar`, { motivo })
  return data
}
