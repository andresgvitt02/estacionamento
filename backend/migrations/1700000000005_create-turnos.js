exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE turnos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
      fechamento TIMESTAMPTZ,
      valor_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
      valor_esperado NUMERIC(10,2),
      valor_declarado NUMERIC(10,2),
      observacoes TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (fechamento IS NULL OR fechamento > abertura)
    );

    -- Turno é entidade própria (decisão do projeto, CLAUDE.md): sem abertura,
    -- operador responsável, fechamento, valor esperado x valor declarado, o
    -- fechamento de caixa não fecha. valor_esperado é calculado pelo sistema
    -- (soma dos pagamentos do turno); valor_declarado é o que o operador conta
    -- na gaveta. A diferença entre os dois é a divergência do caixa.
    CREATE INDEX idx_turnos_usuario ON turnos (usuario_id);

    -- Garante que um mesmo operador não tenha dois turnos abertos ao mesmo tempo.
    CREATE UNIQUE INDEX idx_turnos_usuario_unico_aberto ON turnos (usuario_id)
      WHERE fechamento IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE turnos;');
};
