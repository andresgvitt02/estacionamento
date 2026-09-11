import client from './client'

export async function listarTarifas() {
  const { data } = await client.get('/tarifas')
  return data
}

export async function buscarTarifaVigente() {
  try {
    const { data } = await client.get('/tarifas/vigente')
    return data
  } catch (err) {
    // Rota devolve 404 quando não há tarifa vigente cadastrada ainda —
    // não é erro de tela, é estado inicial válido.
    if (err.message?.includes('nenhuma tarifa vigente')) return null
    throw err
  }
}

// Nunca é PUT: cria uma tarifa nova e o backend encerra a vigência da atual
// (ver CLAUDE.md "Tarifa tem vigência temporal" e tarifaRoutes.js).
export async function criarTarifa(dados) {
  const { data } = await client.post('/tarifas', dados)
  return data
}
