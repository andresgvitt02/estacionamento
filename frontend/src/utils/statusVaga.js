// Deriva o status no front do mesmo jeito que o backend deriva no banco:
// vaga bloqueada tem prioridade, senão existe movimentação aberta (ocupada)
// ou não (livre). Não é o front decidindo o estado — é só lendo o que
// vagaRepository.listarComStatus já calculou (movimentacao_id presente ou
// não), ver CLAUDE.md "Vaga não tem coluna ocupada".
export function derivarStatus(vaga) {
  if (vaga.bloqueada) return 'bloqueada'
  if (vaga.movimentacao_id) return 'ocupada'
  return 'livre'
}
