import client from './client'

// inicio/fim são sempre obrigatórios (ISO) — não existe período default
// escondido no backend (ver relatorioRoutes.js), quem decide é a tela.
export async function buscarResumoTurnos({ inicio, fim }) {
  const { data } = await client.get('/relatorios/turnos', { params: { inicio, fim } })
  return data
}

export async function buscarMovimentacoesPorPeriodo({ inicio, fim }) {
  const { data } = await client.get('/relatorios/movimentacoes', { params: { inicio, fim } })
  return data
}

export async function buscarTotaisPorFormaPagamento({ inicio, fim }) {
  const { data } = await client.get('/relatorios/pagamentos-por-forma', { params: { inicio, fim } })
  return data
}
