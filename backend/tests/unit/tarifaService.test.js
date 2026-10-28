const tarifaService = require('../../src/services/tarifaService');

// Testes unitários da camada de serviço: nenhum aqui sobe servidor nem toca o
// banco (é o argumento central do trabalho, ver CLAUDE.md) — só chamam
// calcularValor com um objeto `tarifa` em memória.
//
// ATENÇÃO: calcularValor foi implementada pela IA a pedido explícito do autor
// ("mesmo que fuja da regra, depois eu reviso" — ver CLAUDE.md, "Como me
// ajudar neste projeto", que reserva esse cálculo pro autor). Os testes
// abaixo cobrem as decisões de design documentadas nos comentários da
// função — antes de levar isso pra banca, confirme se cada uma delas
// realmente representa a regra que você quer, e ajuste função + testes
// juntos se não bater.

const tarifaBase = {
  valor_hora: 10,
  tolerancia_minutos: 15,
  percentual_fracao: 50,
  minutos_fracao: 30,
  arredondamento: 0.5,
};

function dataEm(horas, minutos) {
  return new Date(2024, 0, 1, horas, minutos, 0);
}

describe('tarifaService.calcularValor', () => {
  test('cobra o valor cheio para uma permanência dentro de 1 hora, sem tolerância', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(10, 40); // 40 min: passou da tolerância (15), não passou de 1h

    expect(tarifaService.calcularValor(tarifaBase, entrada, saida)).toBe(10);
  });

  test('não cobra nada se a permanência ficar dentro da tolerância da tarifa', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(10, 10); // 10 min: dentro da tolerância de 15

    expect(tarifaService.calcularValor(tarifaBase, entrada, saida)).toBe(0);
  });

  test('cobra percentual_fracao% de valor_hora por bloco de minutos_fracao no tempo excedente', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(11, 40); // 100 min: 60 min (1ª hora) + 40 min excedente

    // 40 min excedente / 30 min por bloco = 2 blocos (arredonda pra cima)
    // 2 blocos * 50% * R$10 = R$10 de excedente + R$10 da 1ª hora = R$20
    expect(tarifaService.calcularValor(tarifaBase, entrada, saida)).toBe(20);
  });

  test('bloco parcial de excedente conta como bloco inteiro (arredonda pra cima)', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(11, 1); // 61 min: só 1 min de excedente

    // 1 min já fecha 1 bloco inteiro de 30 min: 1 * 50% * R$10 = R$5 + R$10 = R$15
    expect(tarifaService.calcularValor(tarifaBase, entrada, saida)).toBe(15);
  });

  test('arredonda o valor final para cima, no múltiplo configurado em tarifa.arredondamento', () => {
    const tarifa = { ...tarifaBase, valor_hora: 7.3, tolerancia_minutos: 0 };
    const entrada = dataEm(10, 0);
    const saida = dataEm(10, 30); // dentro da 1ª hora → cobra valor_hora cheio (7.30)

    // ceil(7.30 / 0.50) * 0.50 = 7.50
    expect(tarifaService.calcularValor(tarifa, entrada, saida)).toBe(7.5);
  });

  test('não cobra nada quando a permanência é EXATAMENTE igual à tolerância (limite inclusive)', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(10, 15); // exatamente os 15 min de tolerância de tarifaBase

    expect(tarifaService.calcularValor(tarifaBase, entrada, saida)).toBe(0);
  });

  test('cobra a 1ª hora cheia quando a permanência é EXATAMENTE 60 min (limite da 1ª faixa)', () => {
    const tarifa = { ...tarifaBase, tolerancia_minutos: 0 };
    const entrada = dataEm(10, 0);
    const saida = dataEm(11, 0); // exatamente 60 min — ainda cai na decisão 2, não na 3

    expect(tarifaService.calcularValor(tarifa, entrada, saida)).toBe(10);
  });

  test('permanência zero (entrada = saída) não cobra nada mesmo com tolerância zero', () => {
    const tarifa = { ...tarifaBase, tolerancia_minutos: 0 };
    const entrada = dataEm(10, 0);

    expect(tarifaService.calcularValor(tarifa, entrada, entrada)).toBe(0);
  });

  test('excedente que fecha um número exato de blocos não arredonda pra cima um bloco a mais', () => {
    // minutos_fracao=20 aqui (não os 30 de tarifaBase) só pra deixar claro que
    // 40 min de excedente fecham EXATAMENTE 2 blocos de 20 — se o ceil()
    // estivesse arredondando por engano quando já é múltiplo exato, este
    // teste pegaria 3 blocos em vez de 2.
    const tarifa = { ...tarifaBase, tolerancia_minutos: 0, minutos_fracao: 20 };
    const entrada = dataEm(10, 0);
    const saida = dataEm(11, 40); // 100 min: 60 (1ª hora) + 40 de excedente = exatamente 2 blocos de 20

    // 2 blocos * 50% * R$10 = R$10 de excedente + R$10 da 1ª hora = R$20
    expect(tarifaService.calcularValor(tarifa, entrada, saida)).toBe(20);
  });

  test('não arredonda pra cima um valor que já é múltiplo exato do arredondamento configurado', () => {
    const tarifa = { ...tarifaBase, tolerancia_minutos: 0 }; // valor_hora=10, arredondamento=0.5
    const entrada = dataEm(10, 0);
    const saida = dataEm(10, 10); // dentro da 1ª hora → cobra valor_hora cheio (10, já múltiplo de 0.5)

    expect(tarifaService.calcularValor(tarifa, entrada, saida)).toBe(10);
  });

  test('rejeita saída anterior à entrada', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(9, 0);

    expect(() => tarifaService.calcularValor(tarifaBase, entrada, saida)).toThrow();
  });

  // Regressão: o `pg` devolve coluna NUMERIC como STRING, não number (evita
  // perder precisão decimal) — uma tarifa vinda de verdade do banco chega
  // aqui com valor_hora/percentual_fracao/arredondamento como string. Um bug
  // encontrado em revisão fazia `valor_hora + valorExcedente` virar
  // concatenação de string (ex.: "15.00" + 15 = "15.0015") para qualquer
  // permanência acima da 1ª hora, cobrando um valor muito menor que o devido
  // sem erro nenhum. Este teste usa exatamente o formato que vem do banco
  // pra impedir que essa regressão volte sem quebrar o suite.
  test('calcula corretamente quando a tarifa vem com campos NUMERIC como string (formato real do pg)', () => {
    const tarifaComoViriaDoPg = {
      valor_hora: '15.00',
      tolerancia_minutos: 0,
      percentual_fracao: '100.00',
      minutos_fracao: 60,
      arredondamento: '0.50',
    };
    const entrada = dataEm(10, 0);
    const saida = dataEm(12, 10); // 2h10min: 1ª hora + 2 blocos de 60min a 100%

    expect(tarifaService.calcularValor(tarifaComoViriaDoPg, entrada, saida)).toBe(45);
  });
});
