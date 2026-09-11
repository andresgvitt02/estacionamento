const turnoRepository = require('../repositories/turnoRepository');
const pagamentoRepository = require('../repositories/pagamentoRepository');
const transacaoRepository = require('../repositories/transacaoRepository');
const logAuditoriaRepository = require('../repositories/logAuditoriaRepository');
const ApiError = require('../errors/ApiError');

// Abertura de turno: só valida que o operador não tem outro turno aberto (o
// índice único parcial idx_turnos_usuario_unico_aberto garante isso no banco;
// aqui é só pra devolver um 409 com mensagem legível em vez do erro cru do pg).
async function abrir({ usuarioId, valorInicial = 0 }) {
  const turnoAberto = await turnoRepository.findAbertoPorUsuario(usuarioId);
  if (turnoAberto) throw new ApiError(409, 'usuário já tem um turno aberto');

  return turnoRepository.abrir({ usuarioId, valorInicial });
}

// ATENÇÃO (ver CLAUDE.md, "Como me ajudar neste projeto"): esta função é uma
// das três que o projeto reserva para o autor escrever ("fechamento de
// caixa"), e foi implementada aqui a pedido explícito dele mesmo assim, em
// 2026-09-11. Não é o padrão de trabalho deste repositório — antes de levar
// isso pra banca, releia cada linha até conseguir explicá-la como se fosse
// sua, porque, na prática, TEM que ser.
//
// Decisão de design que precisa ser confirmada por você (é a mais discutível
// das duas peças escritas hoje): valor_esperado conta só os pagamentos em
// DINHEIRO do turno, não o faturamento total. O motivo: valor_declarado é
// "quanto o operador contou na gaveta" (CLAUDE.md) — PIX e cartão nunca
// passam pela gaveta física, então incluí-los no valor_esperado faria a
// conferência de caixa nunca bater, mesmo com o caixa fisicamente correto. Se
// a intenção da banca/do negócio for outra ("valor_esperado = faturamento
// total do turno, comparado a um valor_declarado que também é 'tudo que
// entrou'"), essa soma abaixo muda.
//
// Estorno nunca é DELETE (CLAUDE.md) — é um pagamento novo, com
// estorno_de_id apontando pro original. O `valor` de um estorno é sempre
// positivo (CHECK valor >= 0 no schema, ver migration 7); é o `estorno_de_id`
// que diz que esse valor deve ser subtraído, não somado, ao total do turno.
//
// usuarioId aqui é quem está FECHANDO o turno (vem do token, req.usuario.id
// na rota) — não necessariamente o mesmo operador que abriu (ex.: um
// supervisor fecha o caixa de quem já foi embora). É essa identidade que vai
// pro log de auditoria.
async function fechar(turnoId, { usuarioId, valorDeclarado, observacoes } = {}) {
  const turno = await turnoRepository.findById(turnoId);
  if (!turno) throw new ApiError(404, 'turno não encontrado');
  if (turno.fechamento) throw new ApiError(409, 'turno já está fechado');

  if (!(Number(valorDeclarado) >= 0)) {
    throw new ApiError(422, 'valorDeclarado é obrigatório e precisa ser um número maior ou igual a zero');
  }

  const pagamentosDoTurno = await pagamentoRepository.findByTurno(turnoId);
  const somaDinheiro = pagamentosDoTurno
    .filter((p) => p.forma === 'dinheiro')
    .reduce((soma, p) => soma + Number(p.valor) * (p.estorno_de_id ? -1 : 1), 0);

  const valorEsperado = arredondarCentavos(Number(turno.valor_inicial) + somaDinheiro);
  const valorDeclaradoArredondado = arredondarCentavos(Number(valorDeclarado));
  const divergencia = arredondarCentavos(valorDeclaradoArredondado - valorEsperado);

  return transacaoRepository.executar(async (client) => {
    const turnoFechado = await turnoRepository.fechar(
      turnoId,
      { valorEsperado, valorDeclarado: valorDeclaradoArredondado, observacoes },
      client
    );
    // 0 linhas afetadas == outra requisição fechou este turno primeiro (mesma
    // trava de corrida do UPDATE condicional em movimentacaoRepository).
    if (!turnoFechado) {
      throw new ApiError(409, 'turno já foi fechado por outra operação');
    }

    await logAuditoriaRepository.registrar(
      {
        usuarioId,
        acao: 'fechar_turno',
        entidade: 'turno',
        entidadeId: turnoId,
        detalhes: { valorEsperado, valorDeclarado: valorDeclaradoArredondado, divergencia },
      },
      client
    );

    return { ...turnoFechado, divergencia };
  });
}

function arredondarCentavos(valor) {
  return Math.round(valor * 100) / 100;
}

module.exports = { abrir, fechar };
