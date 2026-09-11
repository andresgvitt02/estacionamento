exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE movimentacoes (
      id SERIAL PRIMARY KEY,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id),
      vaga_id INTEGER NOT NULL REFERENCES vagas(id),
      tarifa_id INTEGER NOT NULL REFERENCES tarifas(id),
      turno_entrada_id INTEGER NOT NULL REFERENCES turnos(id),
      turno_saida_id INTEGER REFERENCES turnos(id),
      usuario_entrada_id INTEGER NOT NULL REFERENCES usuarios(id),
      usuario_saida_id INTEGER REFERENCES usuarios(id),
      entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
      saida TIMESTAMPTZ,
      valor_cobrado NUMERIC(10,2),
      notificado_em TIMESTAMPTZ,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (saida IS NULL OR saida > entrada),
      CHECK (
        (saida IS NULL AND valor_cobrado IS NULL)
        OR (saida IS NOT NULL AND valor_cobrado IS NOT NULL)
      )
    );

    -- "Vaga ocupada" e "veículo dentro do estacionamento" são derivados daqui:
    -- saida IS NULL == em aberto. Os dois índices parciais únicos abaixo são a
    -- garantia, em nível de banco, de que esse estado derivado nunca fica
    -- ambíguo: no máximo uma movimentação em aberto por vaga e por veículo.
    CREATE UNIQUE INDEX idx_movimentacoes_vaga_unica_aberta ON movimentacoes (vaga_id)
      WHERE saida IS NULL;
    CREATE UNIQUE INDEX idx_movimentacoes_veiculo_unica_aberta ON movimentacoes (veiculo_id)
      WHERE saida IS NULL;

    CREATE INDEX idx_movimentacoes_veiculo ON movimentacoes (veiculo_id);

    -- notificado_em: suporte à notificação automática (node-cron). Fica marcado
    -- quando a mensagem de permanência prolongada é enviada, pra o agendador não
    -- reenviar a cada ciclo (ver CLAUDE.md).
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE movimentacoes;');
};
