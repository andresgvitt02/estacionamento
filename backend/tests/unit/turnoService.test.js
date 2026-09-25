// Testes unitários do fechamento de caixa — repositórios mockados (mesmo
// argumento de "testável sem banco" do CLAUDE.md).
//
// ATENÇÃO: turnoService.fechar foi implementada pela IA a pedido explícito do
// autor (ver o "ATENÇÃO" em src/services/turnoService.js) — releia aquele
// comentário, em especial a decisão de valor_esperado contar só dinheiro,
// antes de mexer aqui.

jest.mock('../../src/repositories/turnoRepository', () => ({
  findById: jest.fn(),
  fechar: jest.fn(),
}));
jest.mock('../../src/repositories/pagamentoRepository', () => ({
  findByTurno: jest.fn(),
}));
jest.mock('../../src/repositories/logAuditoriaRepository', () => ({
  registrar: jest.fn(),
}));
jest.mock('../../src/repositories/transacaoRepository', () => ({
  executar: jest.fn((tarefa) => tarefa({ fake: 'client' })),
}));

const turnoRepository = require('../../src/repositories/turnoRepository');
const pagamentoRepository = require('../../src/repositories/pagamentoRepository');
const logAuditoriaRepository = require('../../src/repositories/logAuditoriaRepository');
const turnoService = require('../../src/services/turnoService');

const TURNO_ABERTO = { id: 9, usuario_id: 5, valor_inicial: 50, fechamento: null };

beforeEach(() => {
  jest.clearAllMocks();
  turnoRepository.findById.mockResolvedValue(TURNO_ABERTO);
  turnoRepository.fechar.mockImplementation((id, dados) => Promise.resolve({ id, fechamento: new Date(), ...dados }));
  pagamentoRepository.findByTurno.mockResolvedValue([]);
});

describe('turnoService.fechar', () => {
  test('rejeita turno inexistente', async () => {
    turnoRepository.findById.mockResolvedValue(null);

    await expect(turnoService.fechar(999, { usuarioId: 5, valorDeclarado: 50 })).rejects.toThrow(/não encontrado/);
  });

  test('rejeita turno já fechado', async () => {
    turnoRepository.findById.mockResolvedValue({ ...TURNO_ABERTO, fechamento: new Date() });

    await expect(turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 50 })).rejects.toThrow(/já está fechado/);
  });

  test('rejeita sem valorDeclarado', async () => {
    await expect(turnoService.fechar(9, { usuarioId: 5 })).rejects.toThrow(/valorDeclarado/);
  });

  test('rejeita valorDeclarado negativo', async () => {
    await expect(turnoService.fechar(9, { usuarioId: 5, valorDeclarado: -10 })).rejects.toThrow(/valorDeclarado/);
  });

  test('aceita valorDeclarado igual a zero (não é tratado como "ausente")', async () => {
    // Number(0) >= 0 é true, mas "!valorDeclarado" (checagem ingênua de
    // falsy) trataria 0 como se não tivesse sido informado — este teste
    // trava que a validação usa a comparação numérica certa.
    const resultado = await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 0 });

    expect(turnoRepository.fechar).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ valorDeclarado: 0 }),
      { fake: 'client' }
    );
    expect(resultado.divergencia).toBe(-50); // esperado 50 (só valor_inicial) - declarado 0
  });

  test('valor_esperado = valor_inicial quando não há pagamentos', async () => {
    const resultado = await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 50 });

    expect(turnoRepository.fechar).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ valorEsperado: 50, valorDeclarado: 50 }),
      { fake: 'client' }
    );
    expect(resultado.divergencia).toBe(0);
  });

  test('valor_esperado soma só os pagamentos em dinheiro, ignorando pix e cartão', async () => {
    pagamentoRepository.findByTurno.mockResolvedValue([
      { forma: 'dinheiro', valor: 30, estorno_de_id: null },
      { forma: 'pix', valor: 100, estorno_de_id: null },
      { forma: 'cartao', valor: 200, estorno_de_id: null },
    ]);

    await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 80 });

    // valor_inicial (50) + dinheiro (30) = 80 — pix/cartão não entram na gaveta.
    expect(turnoRepository.fechar).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ valorEsperado: 80 }),
      { fake: 'client' }
    );
  });

  test('estorno em dinheiro é subtraído do valor_esperado, não somado', async () => {
    pagamentoRepository.findByTurno.mockResolvedValue([
      { forma: 'dinheiro', valor: 30, estorno_de_id: null },
      { forma: 'dinheiro', valor: 30, estorno_de_id: 1 }, // estorno do pagamento acima
    ]);

    await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 50 });

    // valor_inicial (50) + dinheiro (30) - estorno (30) = 50
    expect(turnoRepository.fechar).toHaveBeenCalledWith(9, expect.objectContaining({ valorEsperado: 50 }), {
      fake: 'client',
    });
  });

  test('calcula divergência como valor_declarado - valor_esperado', async () => {
    pagamentoRepository.findByTurno.mockResolvedValue([{ forma: 'dinheiro', valor: 30, estorno_de_id: null }]);

    // esperado = 50 + 30 = 80; declarado = 75 => faltam 5 na gaveta
    const resultado = await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 75 });

    expect(resultado.divergencia).toBe(-5);
  });

  test('divergência positiva quando sobra dinheiro na gaveta em relação ao esperado', async () => {
    pagamentoRepository.findByTurno.mockResolvedValue([{ forma: 'dinheiro', valor: 30, estorno_de_id: null }]);

    // esperado = 50 + 30 = 80; declarado = 90 => sobraram 10 na gaveta
    const resultado = await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 90 });

    expect(resultado.divergencia).toBe(10);
  });

  test('soma vários pagamentos em dinheiro (não só um) no valor_esperado', async () => {
    pagamentoRepository.findByTurno.mockResolvedValue([
      { forma: 'dinheiro', valor: 20, estorno_de_id: null },
      { forma: 'dinheiro', valor: 15, estorno_de_id: null },
      { forma: 'pix', valor: 999, estorno_de_id: null }, // não deveria entrar na conta
    ]);

    await turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 85 });

    // valor_inicial (50) + dinheiro (20 + 15) = 85
    expect(turnoRepository.fechar).toHaveBeenCalledWith(9, expect.objectContaining({ valorEsperado: 85 }), {
      fake: 'client',
    });
  });

  test('rejeita como corrida vencida quando o UPDATE condicional não afeta nenhuma linha', async () => {
    turnoRepository.fechar.mockResolvedValue(null);

    await expect(turnoService.fechar(9, { usuarioId: 5, valorDeclarado: 50 })).rejects.toThrow(
      /já foi fechado por outra operação/
    );

    expect(logAuditoriaRepository.registrar).not.toHaveBeenCalled();
  });

  test('registra log de auditoria com quem fechou (não necessariamente quem abriu)', async () => {
    await turnoService.fechar(9, { usuarioId: 7, valorDeclarado: 50 }); // turno é do usuário 5, fechado pelo 7

    expect(logAuditoriaRepository.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 7, acao: 'fechar_turno', entidade: 'turno', entidadeId: 9 }),
      { fake: 'client' }
    );
  });
});
