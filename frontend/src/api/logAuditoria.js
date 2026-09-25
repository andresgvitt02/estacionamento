import client from './client'

// Log de auditoria é só leitura por natureza (CLAUDE.md: "Estorno nunca faz
// DELETE... sistema que mexe com dinheiro precisa de trilha de auditoria") —
// não existe POST/PUT aqui porque cada log nasce internamente na service que
// executa a ação auditada (registrar saída, fechar turno, estornar
// pagamento), nunca de uma chamada direta da tela.
export async function buscarLogPorEntidade(entidade, entidadeId) {
  const { data } = await client.get(`/log-auditoria/${entidade}/${entidadeId}`)
  return data
}
