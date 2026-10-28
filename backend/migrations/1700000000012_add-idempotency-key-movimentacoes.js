exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE movimentacoes ADD COLUMN idempotency_key VARCHAR(100);

    -- Suporte à idempotência da confirmação de saída (ver CLAUDE.md "Regras
    -- críticas" e services/movimentacaoService.js): o token é gerado no
    -- front na abertura da tela de saída e enviado junto na confirmação.
    -- Índice único parcial (ignora NULL, então entradas antigas/sem token não
    -- colidem entre si) garante, no banco, que o mesmo token nunca feche duas
    -- movimentações — mesmo sob concorrência (duplo clique, retry de rede).
    CREATE UNIQUE INDEX idx_movimentacoes_idempotency_key ON movimentacoes (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX idx_movimentacoes_idempotency_key;
    ALTER TABLE movimentacoes DROP COLUMN idempotency_key;
  `);
};
