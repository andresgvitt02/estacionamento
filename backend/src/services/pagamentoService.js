const pagamentoRepository = require('../repositories/pagamentoRepository');
const transacaoRepository = require('../repositories/transacaoRepository');
const logAuditoriaRepository = require('../repositories/logAuditoriaRepository');
const ApiError = require('../errors/ApiError');

// Estorno de pagamento (ver CLAUDE.md, "Estorno nunca faz DELETE"): nunca
// edita nem apaga o pagamento original — cria uma nova linha com
// estorno_de_id apontando pra ele, motivo e quem autorizou (exigidos pelo
// CHECK da migration 7). `valor` do estorno continua positivo (mesmo CHECK);
// é o estorno_de_id que sinaliza reversão — quem soma totais
// (turnoService.fechar, relatorioRepository.totaisPorFormaPagamento) já
// inverte o sinal na leitura, então basta este INSERT pra tudo o mais
// (fechamento de caixa, relatórios) refletir o estorno corretamente.
async function estornar(pagamentoId, { usuarioId, motivo }) {
  if (!motivo || !motivo.trim()) {
    throw new ApiError(422, 'motivo do estorno é obrigatório');
  }

  const original = await pagamentoRepository.findById(pagamentoId);
  if (!original) throw new ApiError(404, 'pagamento não encontrado');
  if (original.estorno_de_id) {
    throw new ApiError(409, 'não é possível estornar um estorno');
  }

  const pagamentosDaMovimentacao = await pagamentoRepository.findByMovimentacao(original.movimentacao_id);
  const jaEstornado = pagamentosDaMovimentacao.some((p) => p.estorno_de_id === original.id);
  if (jaEstornado) {
    throw new ApiError(409, 'este pagamento já foi estornado');
  }

  return transacaoRepository.executar(async (client) => {
    const estorno = await pagamentoRepository.create(
      {
        movimentacaoId: original.movimentacao_id,
        turnoId: original.turno_id,
        forma: original.forma,
        valor: original.valor,
        // Estorno de pagamento em dinheiro também precisa preencher
        // valor_recebido/troco (mesmo CHECK que vale pro pagamento normal).
        // Não houve troca de cédula de verdade aqui — valor_recebido = valor
        // e troco = 0 representam "devolveu exatamente o valor", que é o que
        // faz o fechamento de caixa (valor_esperado) bater depois do estorno.
        valorRecebido: original.forma === 'dinheiro' ? original.valor : null,
        troco: original.forma === 'dinheiro' ? 0 : null,
        estornoDeId: original.id,
        motivoEstorno: motivo.trim(),
        autorizadoPorId: usuarioId,
      },
      client
    );

    await logAuditoriaRepository.registrar(
      {
        usuarioId,
        acao: 'estornar_pagamento',
        entidade: 'pagamento',
        entidadeId: original.id,
        detalhes: { estornoId: estorno.id, valor: original.valor, motivo: motivo.trim() },
      },
      client
    );

    return estorno;
  });
}

module.exports = { estornar };
