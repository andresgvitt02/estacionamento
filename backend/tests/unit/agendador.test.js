// Factories explícitas (em vez de automock) pra não puxar as dependências
// reais: movimentacaoRepository abriria pool do pg, e notificador carrega
// whatsappCanal → Baileys, que é ESM puro e quebra o parser do Jest.
jest.mock('../../src/repositories/movimentacaoRepository', () => ({
  findAbertasParaNotificar: jest.fn(),
  marcarNotificada: jest.fn(),
}));
jest.mock('../../src/notificacao/notificador', () => ({
  enviar: jest.fn(),
}));

const movimentacaoRepository = require('../../src/repositories/movimentacaoRepository');
const notificador = require('../../src/notificacao/notificador');
const { processarCiclo } = require('../../src/notificacao/agendador');

// Testes unitários do ciclo do agendador: repositório e canal de notificação
// são mocks (ver CLAUDE.md — a camada de serviço é testável sem banco nem
// canal de verdade). O que se verifica aqui é a orquestração: quem recebe a
// mensagem, e que só quem teve sucesso no envio é marcado como notificado —
// não o texto exato da mensagem nem a expressão cron.

const movimentacaoBase = {
  id: 1,
  placa: 'ABC1D23',
  entrada: new Date(2024, 0, 1, 10, 0, 0),
  telefone_contato: '5551999998888',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NOTIFICACAO_LIMITE_HORAS = '4';
});

describe('agendador.processarCiclo', () => {
  test('envia e marca como notificada cada movimentação pendente', async () => {
    movimentacaoRepository.findAbertasParaNotificar.mockResolvedValue([movimentacaoBase]);
    notificador.enviar.mockResolvedValue();

    await processarCiclo();

    expect(movimentacaoRepository.findAbertasParaNotificar).toHaveBeenCalledWith(4 * 60);
    expect(notificador.enviar).toHaveBeenCalledWith(
      movimentacaoBase.telefone_contato,
      expect.stringContaining(movimentacaoBase.placa)
    );
    expect(movimentacaoRepository.marcarNotificada).toHaveBeenCalledWith(movimentacaoBase.id);
  });

  test('não marca como notificada quando o envio falha, para tentar de novo no próximo ciclo', async () => {
    movimentacaoRepository.findAbertasParaNotificar.mockResolvedValue([movimentacaoBase]);
    notificador.enviar.mockRejectedValue(new Error('canal fora do ar'));

    await processarCiclo();

    expect(notificador.enviar).toHaveBeenCalled();
    expect(movimentacaoRepository.marcarNotificada).not.toHaveBeenCalled();
  });

  test('uma falha não impede o processamento das demais movimentações do ciclo', async () => {
    const outraMovimentacao = { ...movimentacaoBase, id: 2, telefone_contato: '5551988887777' };
    movimentacaoRepository.findAbertasParaNotificar.mockResolvedValue([movimentacaoBase, outraMovimentacao]);
    notificador.enviar
      .mockRejectedValueOnce(new Error('número inválido'))
      .mockResolvedValueOnce();

    await processarCiclo();

    expect(notificador.enviar).toHaveBeenCalledTimes(2);
    expect(movimentacaoRepository.marcarNotificada).toHaveBeenCalledTimes(1);
    expect(movimentacaoRepository.marcarNotificada).toHaveBeenCalledWith(outraMovimentacao.id);
  });

  test('não chama o notificador quando não há movimentações pendentes', async () => {
    movimentacaoRepository.findAbertasParaNotificar.mockResolvedValue([]);

    await processarCiclo();

    expect(notificador.enviar).not.toHaveBeenCalled();
    expect(movimentacaoRepository.marcarNotificada).not.toHaveBeenCalled();
  });
});
