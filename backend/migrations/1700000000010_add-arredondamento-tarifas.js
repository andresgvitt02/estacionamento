exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tarifas
      ADD COLUMN arredondamento NUMERIC(4,2) NOT NULL DEFAULT 0.50
        CHECK (arredondamento > 0);

    -- Múltiplo de arredondamento do valor final cobrado (ex.: 0.50 => valor
    -- sempre sobe pro múltiplo de 50 centavos mais próximo). Existe pra
    -- evitar troco quebrado no pagamento em dinheiro (ver CLAUDE.md,
    -- "Pagamento em dinheiro grava valor_recebido e troco") — decisão de
    -- caixa do dono do estacionamento, não fixa no sistema, por isso é
    -- coluna e não constante.
    --
    -- A direção do arredondamento (sempre pra cima, favorecendo o caixa) e
    -- onde exatamente esse arredondamento entra no cálculo (só no total? em
    -- cada bloco de excedente também?) continuam sendo decisão da camada de
    -- serviço, em 'tarifaService.calcularValor' — não da IA (ver CLAUDE.md,
    -- "Como me ajudar neste projeto").
    COMMENT ON COLUMN tarifas.arredondamento IS
      'Múltiplo (em reais) para o qual o valor final cobrado é arredondado. Default 0.50.';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE tarifas
      DROP COLUMN arredondamento;
  `);
};
