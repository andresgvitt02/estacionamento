// Utilitário de dinheiro compartilhado entre services. Antes desta extração,
// a mesma função (Math.round(valor*100)/100) estava copiada verbatim em
// movimentacaoService.js e turnoService.js — encontrado em revisão de
// código. Não é decisão de negócio (não decide preço nem regra de caixa, só
// evita erro de ponto flutuante ao arredondar pra centavo), por isso vive
// fora das três peças reservadas ao autor (ver CLAUDE.md).
function arredondarCentavos(valor) {
  return Math.round(valor * 100) / 100;
}

module.exports = { arredondarCentavos };
