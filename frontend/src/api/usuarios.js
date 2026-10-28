import client from './client'

export async function listarUsuarios() {
  const { data } = await client.get('/usuarios')
  return data
}

// Cadastro/edição/desativação exige perfil admin no backend (ver
// usuarioRoutes.js) — a tela só chega a mostrar esses formulários pra quem
// já é admin, mas o servidor é quem garante isso de verdade.
export async function criarUsuario(dados) {
  const { data } = await client.post('/usuarios', dados)
  return data
}

export async function atualizarUsuario(id, dados) {
  const { data } = await client.put(`/usuarios/${id}`, dados)
  return data
}

// Nunca DELETE (ver CLAUDE.md e usuarioRepository.js): desativa, não some
// com a conta — ela continua referenciada por movimentações, turnos e log
// de auditoria.
export async function desativarUsuario(id) {
  const { data } = await client.post(`/usuarios/${id}/desativar`)
  return data
}
