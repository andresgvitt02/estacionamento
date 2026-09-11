exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE vagas (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(10) NOT NULL UNIQUE,
      tipo VARCHAR(20) NOT NULL DEFAULT 'comum'
        CHECK (tipo IN ('comum', 'pcd', 'idoso', 'mensalista')),
      bloqueada BOOLEAN NOT NULL DEFAULT false,
      motivo_bloqueio VARCHAR(200),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Sem coluna "ocupada" (decisão do projeto, CLAUDE.md): o estado de ocupação é
    -- derivado da existência de uma Movimentacao com saida IS NULL para esta vaga.
    -- "bloqueada" é diferente: é configuração da vaga (manutenção), não decorre de
    -- movimentação nenhuma, por isso mora aqui como coluna de verdade.
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE vagas;');
};
