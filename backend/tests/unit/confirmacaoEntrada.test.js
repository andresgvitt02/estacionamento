jest.mock('../../src/notificacao/notificador', () => ({ enviar: jest.fn() }));

const { montarMensagem, descreverLimite } = require('../../src/notificacao/confirmacaoEntrada');

describe('confirmacaoEntrada.descreverLimite', () => {
  test.each([
    [4, '4 horas'],
    [1, '1 hora'],
    [0.05, '3 minutos'],
    [1.5, '90 minutos'],
  ])('%p horas vira "%s"', (horas, texto) => {
    expect(descreverLimite(horas)).toBe(texto);
  });
});

describe('confirmacaoEntrada.montarMensagem', () => {
  test('traz placa, data e hora de Brasília e o limite configurado', () => {
    // 17:05 UTC = 14:05 em Brasília
    const mensagem = montarMensagem({
      placa: 'RCX0P21',
      entrada: new Date('2026-11-23T17:05:00Z'),
      limiteHoras: 4,
    });
    expect(mensagem).toBe(
      'Olá! Seu veículo placa RCX0P21 entrou no estacionamento em 23/11/2026 às 14:05. ' +
        'Vamos te avisar por aqui se ele passar de 4 horas estacionado. ' +
        'Qualquer dúvida, procure o operador no local.'
    );
  });
});
