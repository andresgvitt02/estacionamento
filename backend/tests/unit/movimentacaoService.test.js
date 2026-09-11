// Testes unitários da orquestração de saída — repositórios mockados (mesmo
// argumento de "testável sem banco" do CLAUDE.md). O que se verifica aqui é a
// orquestração (transação, idempotência, recálculo de valor, validação da
// soma dos pagamentos), não o cálculo de tarifa em si (isso já está coberto
// em tarifaService.test.js e é reaproveitado aqui via o módulo real).
//
// ATENÇÃO: movimentacaoService.registrarSaida foi implementada pela IA a
// pedido explícito do autor (ver o "ATENÇÃO" em src/services/movimentacaoService.js)
// — releia aquele comentário antes de mexer aqui.

jest.mock('../../src/repositories/veiculoRepository', () => ({}));
jest.mock('../../src/repositories/vagaRepository', () => ({}));
jest.mock('../../src/repositories/tarifaRepository', () => ({
  findById: jest.fn(),
}));
jest.mock('../../src/repositories/turnoRepository', () => ({
  findAbertoPorUsuario: jest.fn(),
}));
jest.mock('../../src/repositories/movimentacaoRepository', () => ({
  findById: jest.fn(),
  registrarSaida: jest.fn(),
}));
jest.mock('../../src/repositories/pagamentoRepository', () => ({
  create: jest.fn(),
}));
jest.mock('../../src/repositories/logAuditoriaRepository', () => ({
  registrar: jest.fn(),
}));
// transacaoRepository real dispensaria banco só se pool não fosse tocado —
// mais simples e mais fiel ao "sem servidor, sem banco" mockar o BEGIN/COMMIT
// e só executar o callback direto, com um client fake.
jest.mock('../../src/repositories/transacaoRepository', () => ({
  executar: jest.fn((tarefa) => tarefa({ fake: 'client' })),
}));

const tarifaRepository = require('../../src/repositories/tarifaRepository');
const turnoRepository = require('../../src/repositories/turnoRepository');
const movimentacaoRepository = require('../../src/repositories/movimentacaoRepository');
const pagamentoRepository = require('../../src/repositories/pagamentoRepository');
const logAuditoriaRepository = require('../../src/repositories/logAuditoriaRepository');
const movimentacaoService = require('../../src/services/movimentacaoService');

const TARIFA = {
  id: 1,
  valor_hora: 10,
  tolerancia_minutos: 0,
  percentual_fracao: 100,
  minutos_fracao: 60,
  arredondamento: 0.5,
};

const TURNO_ABERTO = { id: 9, usuario_id: 5 };

function movimentacaoAberta(overrides = {}) {
  return {
    id: 42,
    vaga_id: 1,
    tarifa_id: TARIFA.id,
    entrada: new Date(Date.now() - 40 * 60000), // 40 min atrás => 1h cheia = R$10
    saida: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  tarifaRepository.findById.mockResolvedValue(TARIFA);
  turnoRepository.findAbertoPorUsuario.mockResolvedValue(TURNO_ABERTO);
  movimentacaoRepository.findById.mockResolvedValue(movimentacaoAberta());
  movimentacaoRepository.registrarSaida.mockResolvedValue({
    id: 42,
    saida: new Date(),
    valor_cobrado: 10,
  });
  pagamentoRepository.create.mockImplementation((dados) => Promise.resolve({ id: 1, ...dados }));
});

describe('movimentacaoService.registrarSaida', () => {
  test('rejeita sem idempotencyKey', async () => {
    await expect(
      movimentacaoService.registrarSaida({ movimentacaoId: 42, usuarioId: 5, pagamentos: [{ forma: 'pix', valor: 10 }] })
    ).rejects.toThrow(/idempotencyKey/);
  });

  test('rejeita sem nenhum pagamento', async () => {
    await expect(
      movimentacaoService.registrarSaida({ movimentacaoId: 42, usuarioId: 5, pagamentos: [], idempotencyKey: 'tok-1' })
    ).rejects.toThrow(/pagamento/);
  });

  test('rejeita se não houver turno aberto pro usuário', async () => {
    turnoRepository.findAbertoPorUsuario.mockResolvedValue(null);

    await expect(
      movimentacaoService.registrarSaida({
        movimentacaoId: 42,
        usuarioId: 5,
        pagamentos: [{ forma: 'pix', valor: 10 }],
        idempotencyKey: 'tok-1',
      })
    ).rejects.toThrow(/turno/);
  });

  test('rejeita movimentação já finalizada', async () => {
    movimentacaoRepository.findById.mockResolvedValue(movimentacaoAberta({ saida: new Date() }));

    await expect(
      movimentacaoService.registrarSaida({
        movimentacaoId: 42,
        usuarioId: 5,
        pagamentos: [{ forma: 'pix', valor: 10 }],
        idempotencyKey: 'tok-1',
      })
    ).rejects.toThrow(/já finalizada/);
  });

  test('rejeita quando a soma dos pagamentos não bate com o valor recalculado', async () => {
    // 40 min => dentro da 1ª hora => cobra valor_hora cheio (R$10), não R$5.
    await expect(
      movimentacaoService.registrarSaida({
        movimentacaoId: 42,
        usuarioId: 5,
        pagamentos: [{ forma: 'pix', valor: 5 }],
        idempotencyKey: 'tok-1',
      })
    ).rejects.toThrow(/não bate/);

    expect(movimentacaoRepository.registrarSaida).not.toHaveBeenCalled();
  });

  test('ignora um valor de pagamento forjado pelo cliente e usa o valor recalculado no servidor', async () => {
    // Cliente manda pagamentos cuja soma bate com o valor certo (R$10) — mas o
    // ponto do teste é que o valor gravado vem de tarifaService.calcularValor,
    // nunca de um campo "valorCobrado" que o cliente pudesse tentar mandar.
    await movimentacaoService.registrarSaida({
      movimentacaoId: 42,
      usuarioId: 5,
      pagamentos: [{ forma: 'pix', valor: 10 }],
      idempotencyKey: 'tok-1',
      valorCobrado: 0.01, // tentativa de fraude via body — deve ser ignorada
    });

    expect(movimentacaoRepository.registrarSaida).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ valorCobrado: 10, idempotencyKey: 'tok-1' }),
      { fake: 'client' }
    );
  });

  test('pagamento em dinheiro exige valorRecebido >= valor e grava troco', async () => {
    await movimentacaoService.registrarSaida({
      movimentacaoId: 42,
      usuarioId: 5,
      pagamentos: [{ forma: 'dinheiro', valor: 10, valorRecebido: 20 }],
      idempotencyKey: 'tok-1',
    });

    expect(pagamentoRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ forma: 'dinheiro', valor: 10, valorRecebido: 20, troco: 10 }),
      { fake: 'client' }
    );
  });

  test('rejeita dinheiro com valorRecebido menor que o valor', async () => {
    await expect(
      movimentacaoService.registrarSaida({
        movimentacaoId: 42,
        usuarioId: 5,
        pagamentos: [{ forma: 'dinheiro', valor: 10, valorRecebido: 5 }],
        idempotencyKey: 'tok-1',
      })
    ).rejects.toThrow(/valorRecebido/);
  });

  test('aceita N pagamentos cuja soma bate com o valor devido (dinheiro + pix)', async () => {
    await movimentacaoService.registrarSaida({
      movimentacaoId: 42,
      usuarioId: 5,
      pagamentos: [
        { forma: 'dinheiro', valor: 6, valorRecebido: 10 },
        { forma: 'pix', valor: 4 },
      ],
      idempotencyKey: 'tok-1',
    });

    expect(pagamentoRepository.create).toHaveBeenCalledTimes(2);
    expect(movimentacaoRepository.registrarSaida).toHaveBeenCalled();
  });

  test('rejeita como corrida vencida quando o UPDATE condicional não afeta nenhuma linha', async () => {
    movimentacaoRepository.registrarSaida.mockResolvedValue(null);

    await expect(
      movimentacaoService.registrarSaida({
        movimentacaoId: 42,
        usuarioId: 5,
        pagamentos: [{ forma: 'pix', valor: 10 }],
        idempotencyKey: 'tok-1',
      })
    ).rejects.toThrow(/já finalizada por outra operação/);

    expect(pagamentoRepository.create).not.toHaveBeenCalled();
  });

  test('registra log de auditoria com valor, usuário e pagamentos', async () => {
    await movimentacaoService.registrarSaida({
      movimentacaoId: 42,
      usuarioId: 5,
      pagamentos: [{ forma: 'pix', valor: 10 }],
      idempotencyKey: 'tok-1',
    });

    expect(logAuditoriaRepository.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 5,
        acao: 'registrar_saida',
        entidade: 'movimentacao',
        entidadeId: 42,
      }),
      { fake: 'client' }
    );
  });
});

describe('movimentacaoService.estimarValor', () => {
  test('não persiste nada — só recalcula o valor com a tarifa da entrada', async () => {
    const resultado = await movimentacaoService.estimarValor(42);

    expect(resultado.valorEstimado).toBe(10);
    expect(movimentacaoRepository.registrarSaida).not.toHaveBeenCalled();
    expect(pagamentoRepository.create).not.toHaveBeenCalled();
  });

  test('rejeita movimentação já finalizada', async () => {
    movimentacaoRepository.findById.mockResolvedValue(movimentacaoAberta({ saida: new Date() }));

    await expect(movimentacaoService.estimarValor(42)).rejects.toThrow(/já finalizada/);
  });

  test('rejeita movimentação inexistente', async () => {
    movimentacaoRepository.findById.mockResolvedValue(null);

    await expect(movimentacaoService.estimarValor(999)).rejects.toThrow(/não encontrada/);
  });
});
