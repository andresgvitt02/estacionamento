exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tarifas
      ADD COLUMN percentual_fracao NUMERIC(5,2) NOT NULL DEFAULT 100
        CHECK (percentual_fracao > 0),
      ADD COLUMN minutos_fracao INTEGER NOT NULL DEFAULT 60
        CHECK (minutos_fracao > 0);

    -- Cobrança de tempo excedente configurável pelo dono do estacionamento
    -- (decisão de negócio dele, não do sistema — ver CLAUDE.md e
    -- docs/modelagem-banco.md): depois da 1ª hora/tolerância, cada bloco de
    -- 'minutos_fracao' minutos adicionais custa 'percentual_fracao'% de
    -- 'valor_hora'. Os valores padrão (100%, 60 min) reproduzem o
    -- comportamento anterior — hora cheia sempre ao preço integral — pra não
    -- quebrar tarifa nenhuma já cadastrada; o dono ajusta pra, por exemplo,
    -- cobrar frações de 30 min a 50% do valor da hora.
    --
    -- Continua fora do schema, de propósito, a fórmula que usa esses dois
    -- números pra chegar no valor final (arredonda pra cima? pra baixo? o
    -- que conta como "excedente" — depois da tolerância ou depois da 1ª
    -- hora?) — isso é 'tarifaService.calcularValor', e não é a IA quem
    -- escreve (ver CLAUDE.md, "Como me ajudar neste projeto").
    COMMENT ON COLUMN tarifas.percentual_fracao IS
      'Percentual de valor_hora cobrado por bloco de minutos_fracao no tempo excedente. Default 100 = sem desconto na fração.';
    COMMENT ON COLUMN tarifas.minutos_fracao IS
      'Tamanho, em minutos, do bloco de tempo excedente cobrado a percentual_fracao. Default 60 = mesmo comportamento de hora cheia.';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE tarifas
      DROP COLUMN percentual_fracao,
      DROP COLUMN minutos_fracao;
  `);
};
