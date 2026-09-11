exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE veiculos (
      id SERIAL PRIMARY KEY,
      placa VARCHAR(8) NOT NULL,
      tipo VARCHAR(20) NOT NULL DEFAULT 'carro'
        CHECK (tipo IN ('carro', 'moto', 'outro')),
      modelo VARCHAR(60),
      cor VARCHAR(30),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Índice não-único de propósito: placa é dado de busca, não chave (ver CLAUDE.md
    -- "Chave é id, não placa" — placa muda de dono e o padrão Mercosul já quebrou
    -- sistema por aí). Serve só para localizar o histórico de um veículo rapidamente.
    CREATE INDEX idx_veiculos_placa ON veiculos (placa);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE veiculos;');
};
