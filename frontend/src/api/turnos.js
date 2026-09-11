import client from './client'

export async function abrirTurno({ usuarioId, valorInicial }) {
  const { data } = await client.post('/turnos/abrir', { usuarioId, valorInicial })
  return data
}

// valorEsperado não é enviado: quem calcula é o servidor, a partir da soma
// dos pagamentos em dinheiro do turno (ver turnoService.fechar) — o front só
// manda o que o operador contou na gaveta.
export async function fecharTurno(id, { valorDeclarado, observacoes }) {
  const { data } = await client.post(`/turnos/${id}/fechar`, { valorDeclarado, observacoes })
  return data
}
