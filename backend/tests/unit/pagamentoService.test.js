// Testes unitários do estorno de pagamento — repositórios mockados, sem
// banco (mesmo argumento de "testável sem servidor" do CLAUDE.md).

jest.mock('../../src/repositories/pagamentoRepository', () => ({
  findById: jest.fn(),
  findByMovimentacao: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/repositories/logAuditoriaRepository', () => ({
  registrar: jest.fn(),
}));
jest.mock('../../src/repositories/transacaoRepository', () => ({
  executar: jest.fn((tarefa) => tarefa({ fake: 'client' })),
}));

const pagamentoRepository = require('../../src/repositories/pagamentoRepository');
const logAuditoriaRepository = require('../../src/repositories/logAuditoriaRepository');
const pagamentoService = require('../../src/services/pagamentoService');

const PAGAMENTO_DINHEIRO = {
  id: 1,
  movimentacao_id: 42,
  turno_id: 9,
  forma: 'dinheiro',
  valor: 30,
  valor_recebido: 50,
  troco: 20,
  estorno_de_id: null,
};

const PAGAMENTO_PIX = {
  id: 2,
  movimentacao_id: 43,
  turno_id: 9,
  forma: 'pix',
  valor: 15,
  valor_recebido: null,
  troco: null,
  estorno_de_id: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  pagamentoRepository.findByMovimentacao.mockResolvedValue([]);
  pagamentoRepository.create.mockImplementation(async (dados) => ({ id: 999, ...dados }));
});

describe('pagamentoService.estornar', () => {
  test('cria um novo pagamento com estorno_de_id, nunca edita nem apaga o original', async () => {
    pagamentoRepository.findById.mockResolvedValue(PAGAMENTO_DINHEIRO);

    const estorno = await pagamentoService.estornar(1, { usuarioId: 7, motivo: 'forma errada' });

    expect(pagamentoRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        movimentacaoId: 42,
        turnoId: 9,
        forma: 'dinheiro',
        valor: 30,
        valorRecebido: 30,
        troco: 0,
        estornoDeId: 1,
        motivoEstorno: 'forma errada',
        autorizadoPorId: 7,
      }),
      { fake: 'client' }
    );
    expect(estorno.estornoDeId).toBe(1);
    expect(logAuditoriaRepository.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 7, acao: 'estornar_pagamento', entidade: 'pagamento', entidadeId: 1 }),
      { fake: 'client' }
    );
  });

  test('estorno de pagamento não-dinheiro não preenche valor_recebido/troco', async () => {
    pagamentoRepository.findById.mockResolvedValue(PAGAMENTO_PIX);

    await pagamentoService.estornar(2, { usuarioId: 7, motivo: 'duplicado' });

    expect(pagamentoRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ valorRecebido: null, troco: null }),
      { fake: 'client' }
    );
  });

  test('rejeita motivo vazio', async () => {
    await expect(pagamentoService.estornar(1, { usuarioId: 7, motivo: '  ' })).rejects.toThrow(
      'motivo do estorno é obrigatório'
    );
    expect(pagamentoRepository.findById).not.toHaveBeenCalled();
  });

  test('rejeita estornar um pagamento inexistente', async () => {
    pagamentoRepository.findById.mockResolvedValue(null);

    await expect(pagamentoService.estornar(999, { usuarioId: 7, motivo: 'x' })).rejects.toThrow(
      'pagamento não encontrado'
    );
  });

  test('rejeita estornar um estorno (não permite cadeia de estornos)', async () => {
    pagamentoRepository.findById.mockResolvedValue({ ...PAGAMENTO_DINHEIRO, id: 3, estorno_de_id: 1 });

    await expect(pagamentoService.estornar(3, { usuarioId: 7, motivo: 'x' })).rejects.toThrow(
      'não é possível estornar um estorno'
    );
  });

  test('rejeita estornar o mesmo pagamento duas vezes', async () => {
    pagamentoRepository.findById.mockResolvedValue(PAGAMENTO_DINHEIRO);
    pagamentoRepository.findByMovimentacao.mockResolvedValue([
      PAGAMENTO_DINHEIRO,
      { id: 50, estorno_de_id: 1 },
    ]);

    await expect(pagamentoService.estornar(1, { usuarioId: 7, motivo: 'x' })).rejects.toThrow(
      'este pagamento já foi estornado'
    );
  });
});
