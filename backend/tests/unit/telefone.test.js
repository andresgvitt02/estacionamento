const { normalizarTelefone } = require('../../src/utils/telefone');

describe('normalizarTelefone', () => {
  test.each([
    ['51995575290', '5551995575290'], // DDD + celular, sem 55 (caso do bug)
    ['(51) 99557-5290', '5551995575290'], // com pontuação
    ['5136261234', '555136261234'], // DDD + fixo
    ['5551995575290', '5551995575290'], // já completo
    ['+55 51 99557-5290', '5551995575290'], // com + e espaços
  ])('%s -> %s', (entrada, esperado) => {
    expect(normalizarTelefone(entrada)).toBe(esperado);
  });

  test.each([[null], [''], ['12345'], ['999999999999999']])('formato não reconhecido (%p) -> null', (entrada) => {
    expect(normalizarTelefone(entrada)).toBeNull();
  });
});
