exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE pagamentos (
      id SERIAL PRIMARY KEY,
      movimentacao_id INTEGER NOT NULL REFERENCES movimentacoes(id),
      turno_id INTEGER NOT NULL REFERENCES turnos(id),
      forma VARCHAR(20) NOT NULL CHECK (forma IN ('dinheiro', 'pix', 'cartao')),
      valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
      valor_recebido NUMERIC(10,2),
      troco NUMERIC(10,2),
      estorno_de_id INTEGER REFERENCES pagamentos(id),
      motivo_estorno VARCHAR(200),
      autorizado_por_id INTEGER REFERENCES usuarios(id),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (
        forma <> 'dinheiro' OR (valor_recebido IS NOT NULL AND troco IS NOT NULL)
      ),
      CHECK (
        estorno_de_id IS NULL
        OR (motivo_estorno IS NOT NULL AND autorizado_por_id IS NOT NULL)
      )
    );

    -- Pagamento é entidade separada da movimentação (decisão do projeto, CLAUDE.md):
    -- uma movimentação pode ter N pagamentos (ex.: dinheiro + PIX na mesma saída).
    -- A soma dos pagamentos de uma movimentação tem que bater com o valor_cobrado
    -- gravado nela — essa validação é regra de serviço, não do schema.
    --
    -- Estorno nunca é DELETE: é uma nova linha com estorno_de_id apontando pro
    -- pagamento revertido, motivo_estorno e autorizado_por_id preenchidos. A trilha
    -- de auditoria fica no próprio histórico da tabela.
    CREATE INDEX idx_pagamentos_movimentacao ON pagamentos (movimentacao_id);
    CREATE INDEX idx_pagamentos_turno ON pagamentos (turno_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE pagamentos;');
};
