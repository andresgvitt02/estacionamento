const tarifaRepository = require('../repositories/tarifaRepository');
const ApiError = require('../errors/ApiError');

// Cálculo de tarifa.
//
// Por decisão do projeto (CLAUDE.md, "Como me ajudar neste projeto"), esta é
// uma das três peças que a IA não escreveria por padrão — é sobre o que você
// vai ser arguido na banca. `calcularValor` abaixo foi implementada pela IA
// mesmo assim, a pedido explícito do autor (ver comentário "ATENÇÃO" logo
// antes da função). Releia esse aviso antes de mexer aqui.
//
// Contexto que já está decidido no schema (ver docs/modelagem-banco.md) e que
// o cálculo precisa respeitar:
//   - `tarifa.valor_hora` e `tarifa.tolerancia_minutos` são o modelo mínimo de
//     tarifação hoje. `tarifa.percentual_fracao` e `tarifa.minutos_fracao`
//     existem pra deixar a cobrança do tempo excedente configurável pelo dono
//     do estacionamento (ver migration 1700000000009) — o que "excedente"
//     significa exatamente (depois da tolerância? depois da 1ª hora?) é
//     decisão sua. `tarifa.arredondamento` (migration 1700000000010) é o
//     múltiplo em reais pro qual o valor final deve subir (ex.: 0.50 => nunca
//     cobra fração de 50 centavos) — pensado pra pagamento em dinheiro não
//     gerar troco quebrado.
//   - A tarifa vigente é buscada via `tarifaRepository.buscarVigente(data)`,
//     que já resolve a vigência temporal (data_inicio/data_fim). Esta service
//     não deveria precisar reabrir essa decisão.
//   - O valor calculado aqui é o que a service de saída (ainda não escrita)
//     vai gravar em `movimentacoes.valor_cobrado` — nunca um valor vindo do
//     cliente (ver CLAUDE.md "O servidor recalcula o valor. Sempre.").

/**
 * Calcula o valor devido por uma permanência, dada a tarifa vigente.
 *
 * @param {{ valor_hora: number, tolerancia_minutos: number, percentual_fracao: number, minutos_fracao: number, arredondamento: number }} tarifa
 * @param {Date} entrada
 * @param {Date} saida
 * @returns {number} valor a cobrar, em reais
 */
// ATENÇÃO (ver CLAUDE.md, "Como me ajudar neste projeto"): esta função é uma
// das três que o projeto reserva para o autor escrever, e foi implementada
// aqui a pedido explícito dele mesmo assim ("mesmo que fuja da regra, depois
// eu reviso") — não é o padrão de trabalho deste repositório. As 4 decisões
// de design que ficaram em aberto na conversa (onde a tolerância entra, onde
// começa o excedente, se hora cheia se repete, arredondamento de bloco
// parcial) foram resolvidas abaixo com uma interpretação específica — leia
// os comentários numerados e ajuste o que não bater com a regra real antes
// de levar isso pra banca. Antes de reescrever, você precisa entender e
// conseguir explicar cada linha como se fosse sua — porque, na prática, TEM
// que ser.
const PRIMEIRA_HORA_MINUTOS = 60;

function calcularValor(tarifa, entrada, saida) {
  const { valor_hora, tolerancia_minutos, percentual_fracao, minutos_fracao, arredondamento } = tarifa;

  const permanenciaMinutos = (new Date(saida).getTime() - new Date(entrada).getTime()) / 60000;

  if (!Number.isFinite(permanenciaMinutos) || permanenciaMinutos < 0) {
    throw new ApiError(422, 'data de saída não pode ser anterior à data de entrada');
  }

  // Decisão 1: tolerância é carência no início — permanência inteira dentro
  // da tolerância não cobra nada. (A alternativa seria carência só depois de
  // completar uma hora; não foi essa a escolhida aqui.)
  if (permanenciaMinutos <= tolerancia_minutos) {
    return 0;
  }

  // Decisão 2: a 1ª hora, uma vez ultrapassada a tolerância, é sempre cobrada
  // inteira — sem proporcionalidade dentro dela.
  if (permanenciaMinutos <= PRIMEIRA_HORA_MINUTOS) {
    return arredondarParaCima(valor_hora, arredondamento);
  }

  // Decisão 3: depois da 1ª hora, NÃO se repete "hora cheia" pras horas
  // seguintes — tudo vira bloco de minutos_fracao a percentual_fracao% de
  // valor_hora, inclusive a 2ª, 3ª hora etc.
  const minutosExcedentes = permanenciaMinutos - PRIMEIRA_HORA_MINUTOS;

  // Decisão 4: bloco parcial de excedente conta como bloco inteiro
  // (arredonda pra cima o número de blocos, não o valor).
  const blocosExcedentes = Math.ceil(minutosExcedentes / minutos_fracao);
  const valorExcedente = blocosExcedentes * (percentual_fracao / 100) * valor_hora;

  return arredondarParaCima(valor_hora + valorExcedente, arredondamento);
}

// Decisão 5: arredondamento sempre pra cima, pro múltiplo configurado em
// tarifa.arredondamento — pensado pra pagamento em dinheiro nunca gerar
// troco de centavos avulsos (ver CLAUDE.md).
function arredondarParaCima(valor, multiplo) {
  const arredondado = Math.ceil(valor / multiplo) * multiplo;
  // Corrige erro de ponto flutuante (ex.: 7.5000000000000009) antes de devolver.
  return Math.round(arredondado * 100) / 100;
}

// Isto aqui já é só orquestração de CRUD respeitando a vigência temporal
// (não é cálculo de valor cobrado, por isso não fica reservado pra você):
// encerra a tarifa vigente na data de início da nova e cria a linha nova.
// Nunca faz UPDATE em valor_hora de uma tarifa existente (ver CLAUDE.md).
//
// percentualFracao/minutosFracao/arredondamento configuram a cobrança do
// tempo excedente e o arredondamento do valor final — é decisão do dono do
// estacionamento, não da IA nem fixa no código (ver migrations
// 1700000000009/1700000000010 e docs/modelagem-banco.md); os defaults abaixo
// só reproduzem "hora cheia ao preço integral, arredondado pra R$0,50" até o
// dono definir outra coisa.
async function definirNovaTarifa({
  descricao,
  valorHora,
  toleranciaMinutos = 0,
  percentualFracao = 100,
  minutosFracao = 60,
  arredondamento = 0.5,
  dataInicio = new Date(),
}) {
  const vigente = await tarifaRepository.buscarVigente(dataInicio);
  if (vigente) {
    await tarifaRepository.encerrarVigencia(vigente.id, dataInicio);
  }
  return tarifaRepository.create({
    descricao,
    valorHora,
    toleranciaMinutos,
    percentualFracao,
    minutosFracao,
    arredondamento,
    dataInicio,
  });
}

module.exports = { calcularValor, definirNovaTarifa, arredondarParaCima };
