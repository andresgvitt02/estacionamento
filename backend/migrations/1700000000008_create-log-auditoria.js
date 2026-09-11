exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE log_auditoria (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      acao VARCHAR(50) NOT NULL,
      entidade VARCHAR(50) NOT NULL,
      entidade_id INTEGER NOT NULL,
      detalhes JSONB,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Quem registrou qual saída, com que valor, quando (ver CLAUDE.md). "detalhes"
    -- guarda um retrato dos dados relevantes no momento da ação (ex.: valor cobrado,
    -- forma de pagamento) para o log sobreviver mesmo se os dados originais mudarem.
    CREATE INDEX idx_log_auditoria_entidade ON log_auditoria (entidade, entidade_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE log_auditoria;');
};
