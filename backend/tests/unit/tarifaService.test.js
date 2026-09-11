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

  test('rejeita saída anterior à entrada', () => {
    const entrada = dataEm(10, 0);
    const saida = dataEm(9, 0);

    expect(() => tarifaService.calcularValor(tarifaBase, entrada, saida)).toThrow();
  });
});
