exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE tarifas (
      id SERIAL PRIMARY KEY,
      descricao VARCHAR(120) NOT NULL,
      valor_hora NUMERIC(10,2) NOT NULL CHECK (valor_hora >= 0),
      tolerancia_minutos INTEGER NOT NULL DEFAULT 0 CHECK (tolerancia_minutos >= 0),
      data_inicio TIMESTAMPTZ NOT NULL,
      data_fim TIMESTAMPTZ,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (data_fim IS NULL OR data_fim > data_inicio)
    );

    -- Vigência temporal (decisão do projeto, CLAUDE.md): alterar preço não pode mudar
    -- o faturamento de períodos passados. Por isso tarifa nunca é editada em cima da
    -- existente — encerra-se a vigência atual (preenche data_fim) e cria-se uma nova
    -- linha. O valor efetivamente cobrado fica gravado na própria Movimentacao,
    -- junto com a referência a qual tarifa foi aplicada.
    --
    -- valor_hora e tolerancia_minutos aqui são um modelo mínimo de tarifação
    -- (propositalmente simples). O formato exato do cálculo — fração por hora cheia,
    -- fração por minuto, tarifa diferente por tipo de veículo, etc. — é decisão da
    -- camada de serviço, não do schema, e fica para quando o cálculo de tarifa for
    -- desenhado (não é algo que a IA deve escrever, ver CLAUDE.md).
    CREATE INDEX idx_tarifas_vigencia ON tarifas (data_inicio, data_fim);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE tarifas;');
};
