import client from './client'

// Espelha vagaRepository.listarComStatus: cada vaga vem com o status já
// derivado a partir de existir ou não uma movimentação aberta (ver
// CLAUDE.md "Vaga não tem coluna ocupada").
export async function listarVagas() {
  const { data } = await client.get('/vagas')
  return data
}

export async function bloquearVaga(id, motivo) {
  const { data } = await client.post(`/vagas/${id}/bloquear`, { motivo })
  return data
}

export async function desbloquearVaga(id) {
  const { data } = await client.post(`/vagas/${id}/desbloquear`)
  return data
}

// Cadastro/edição de vaga (inclusive marcação PCD/idoso/mensalista, ver
// CLAUDE.md "Interface") exige perfil admin no backend — configuração do
// estacionamento não é ação de operador.
export async function criarVaga(dados) {
  const { data } = await client.post('/vagas', dados)
  return data
}

export async function atualizarVaga(id, dados) {
  const { data } = await client.put(`/vagas/${id}`, dados)
  return data
}
