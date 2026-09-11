const veiculoRepository = require('../repositories/veiculoRepository');
const vagaRepository = require('../repositories/vagaRepository');
const tarifaRepository = require('../repositories/tarifaRepository');
const turnoRepository = require('../repositories/turnoRepository');
const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const pagamentoRepository = require('../repositories/pagamentoRepository');
const transacaoRepository = require('../repositories/transacaoRepository');
const logAuditoriaRepository = require('../repositories/logAuditoriaRepository');
const tarifaService = require('./tarifaService');
const ApiError = require('../errors/ApiError');

// Entrada: validação de vaga/veículo + achar a tarifa vigente. É CRUD com
// checagem de estado, não decide valor nenhum — por isso está implementada.
// O índice único parcial idx_movimentacoes_vaga_unica_aberta cobre a corrida
// entre duas requisições concorrentes pra mesma vaga; se ela acontecer, o
// INSERT estoura unique_violation e o errorHandler devolve 409.
//
// turnoId não é parâmetro: vem sempre do turno aberto do próprio usuarioId
// autenticado (nunca do body/cliente — ver CLAUDE.md "O servidor recalcula
// o valor. Sempre.", mesmo princípio aplicado aqui à identidade de quem
// registra).
async function registrarEntrada({ veiculo, vagaId, usuarioId, telefoneContato }) {
  const turno = await turnoRepository.findAbertoPorUsuario(usuarioId);
  if (!turno) throw new ApiError(409, 'abra um turno antes de registrar entrada');

  const vaga = await vagaRepository.findById(vagaId);
  if (!vaga) throw new ApiError(404, 'vaga não encontrada');
  if (vaga.bloqueada) throw new ApiError(409, 'vaga bloqueada');

  const vagaOcupada = await movimentacaoRepository.findAbertaPorVaga(vagaId);
  if (vagaOcupada) throw new ApiError(409, 'vaga já está ocupada');

  const [veiculoExistente] = await veiculoRepository.findByPlaca(veiculo.placa);
  let veiculoRegistrado = veiculoExistente;

  if (veiculoRegistrado) {
    const veiculoDentro = await movimentacaoRepository.findAbertaPorVeiculo(veiculoRegistrado.id);
    if (veiculoDentro) throw new ApiError(409, 'veículo já está dentro do estacionamento');
  } else {
    veiculoRegistrado = await veiculoRepository.create(veiculo);
  }

  const tarifa = await tarifaRepository.buscarVigente();
  if (!tarifa) throw new ApiError(422, 'nenhuma tarifa vigente cadastrada');

  return movimentacaoRepository.registrarEntrada({
    veiculoId: veiculoRegistrado.id,
    vagaId,
    tarifaId: tarifa.id,
    turnoId: turno.id,
    usuarioId,
    // Opcional (LGPD — ver CLAUDE.md): string vazia vira null, não fica
    // gravado como valor "preenchido" à toa.
    telefoneContato: telefoneContato?.trim() || null,
  });
}

// ATENÇÃO (ver CLAUDE.md, "Como me ajudar neste projeto"): esta função é uma
// das três que o projeto reserva para o autor escrever ("transação de
// saída"), e foi implementada aqui a pedido explícito dele mesmo assim, em
// 2026-09-11. Não é o padrão de trabalho deste repositório — antes de levar
// isso pra banca, releia cada linha até conseguir explicá-la como se fosse
// sua, porque, na prática, TEM que ser.
//
// Decisões tomadas abaixo que valem a pena questionar antes da banca:
//
//   1. Qual tarifa se aplica na saída: a que estava vigente na ENTRADA
//      (movimentacao.tarifa_id, gravada por registrarEntrada), não a vigente
//      agora. Isso é o que a modelagem já decide (ver CLAUDE.md "Tarifa tem
//      vigência temporal") — se o preço mudou no meio da permanência, quem
//      entrou paga pela tarifa de quando entrou.
//   2. "Liberar vaga" não é um passo à parte: como vaga não tem coluna
//      `ocupada` (CLAUDE.md), a vaga já volta a aparecer livre no instante em
//      que `saida` deixa de ser NULL. Não existe uma terceira escrita "liberar
//      vaga" pra incluir na transação.
//   3. N pagamentos por saída (CLAUDE.md "Pagamento é entidade separada"): o
//      corpo da requisição manda uma LISTA de pagamentos (ex.: parte dinheiro,
//      parte PIX), e a soma dela precisa bater exatamente com o valor
//      recalculado pelo servidor — nunca com um valor vindo do cliente.
//   4. Idempotência: a trava principal é o próprio UPDATE condicional em
//      movimentacaoRepository.registrarSaida (`WHERE saida IS NULL` — duas
//      requisições pra mesma movimentação nunca fecham as duas). O
//      `idempotencyKey`, gerado no front na abertura da tela e com índice
//      único parcial no banco (migration 12), é uma segunda trava,
//      independente da primeira: mesmo que a lógica de aplicação mude no
//      futuro, reenviar o mesmo token nunca gera um segundo fechamento.
//
// usuarioId vem de req.usuario.id (nunca do body — mesmo princípio da
// entrada). movimentacaoId, pagamentos e idempotencyKey vêm do body.
async function registrarSaida({ movimentacaoId, usuarioId, pagamentos, idempotencyKey }) {
  if (!idempotencyKey) throw new ApiError(400, 'idempotencyKey é obrigatório');
  if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
    throw new ApiError(400, 'informe ao menos um pagamento');
  }

  const turno = await turnoRepository.findAbertoPorUsuario(usuarioId);
  if (!turno) throw new ApiError(409, 'abra um turno antes de registrar saída');

  const movimentacao = await movimentacaoRepository.findById(movimentacaoId);
  if (!movimentacao) throw new ApiError(404, 'movimentação não encontrada');
  if (movimentacao.saida) throw new ApiError(409, 'movimentação já finalizada');

  const tarifa = await tarifaRepository.findById(movimentacao.tarifa_id);
  if (!tarifa) throw new ApiError(422, 'tarifa aplicada na entrada não existe mais');

  const agora = new Date();
  const valorCobrado = tarifaService.calcularValor(tarifa, movimentacao.entrada, agora);

  for (const pagamento of pagamentos) {
    if (!['dinheiro', 'pix', 'cartao'].includes(pagamento.forma)) {
      throw new ApiError(422, `forma de pagamento inválida: ${pagamento.forma}`);
    }
    if (!(Number(pagamento.valor) >= 0)) {
      throw new ApiError(422, 'valor do pagamento precisa ser um número maior ou igual a zero');
    }
    if (pagamento.forma === 'dinheiro' && !(Number(pagamento.valorRecebido) >= Number(pagamento.valor))) {
      throw new ApiError(422, 'valorRecebido em dinheiro não pode ser menor que o valor do pagamento');
    }
  }

  const somaPagamentos = arredondarCentavos(pagamentos.reduce((soma, p) => soma + Number(p.valor), 0));
  if (somaPagamentos !== arredondarCentavos(valorCobrado)) {
    throw new ApiError(
      422,
      `soma dos pagamentos (${somaPagamentos}) não bate com o valor devido (${valorCobrado})`
    );
  }

  return transacaoRepository.executar(async (client) => {
    const movimentacaoFechada = await movimentacaoRepository.registrarSaida(
      movimentacaoId,
      { saida: agora, valorCobrado, turnoSaidaId: turno.id, usuarioSaidaId: usuarioId, idempotencyKey },
      client
    );
    // 0 linhas afetadas == outra requisição fechou esta movimentação primeiro
    // (corrida vencida pelo UPDATE condicional, ver decisão 4 acima).
    if (!movimentacaoFechada) {
      throw new ApiError(409, 'movimentação já finalizada por outra operação');
    }

    const pagamentosRegistrados = [];
    for (const pagamento of pagamentos) {
      const dinheiro = pagamento.forma === 'dinheiro';
      pagamentosRegistrados.push(
        await pagamentoRepository.create(
          {
            movimentacaoId,
            turnoId: turno.id,
            forma: pagamento.forma,
            valor: pagamento.valor,
            valorRecebido: dinheiro ? pagamento.valorRecebido : null,
            troco: dinheiro ? arredondarCentavos(pagamento.valorRecebido - pagamento.valor) : null,
          },
          client
        )
      );
    }

    await logAuditoriaRepository.registrar(
      {
        usuarioId,
        acao: 'registrar_saida',
        entidade: 'movimentacao',
        entidadeId: movimentacaoId,
        detalhes: { valorCobrado, pagamentos: pagamentos.map((p) => ({ forma: p.forma, valor: p.valor })) },
      },
      client
    );

    return { ...movimentacaoFechada, pagamentos: pagamentosRegistrados };
  });
}

function arredondarCentavos(valor) {
  return Math.round(valor * 100) / 100;
}

// Preview do valor a cobrar SE a saída fosse feita agora. Não persiste nada —
// só reaproveita tarifaService.calcularValor (já escrita) pra a tela de saída
// mostrar o valor antes do operador escolher a forma de pagamento. Não é uma
// das três peças reservadas: não decide a fórmula nem faz a transação, só lê.
// O valor definitivo, o que de fato é cobrado, continua sendo recalculado de
// novo dentro de registrarSaida (nunca confia neste preview).
async function estimarValor(movimentacaoId) {
  const movimentacao = await movimentacaoRepository.findById(movimentacaoId);
  if (!movimentacao) throw new ApiError(404, 'movimentação não encontrada');
  if (movimentacao.saida) throw new ApiError(409, 'movimentação já finalizada');

  const tarifa = await tarifaRepository.findById(movimentacao.tarifa_id);
  if (!tarifa) throw new ApiError(422, 'tarifa aplicada na entrada não existe mais');

  const agora = new Date();
  return {
    valorEstimado: tarifaService.calcularValor(tarifa, movimentacao.entrada, agora),
    calculadoEm: agora,
  };
}

module.exports = { registrarEntrada, registrarSaida, estimarValor };
