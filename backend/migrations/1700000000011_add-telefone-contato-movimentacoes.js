exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE movimentacoes
      ADD COLUMN telefone_contato VARCHAR(20);

    -- Telefone de contato pra notificação de permanência prolongada (ver
    -- CLAUDE.md, "Notificação automática" e "LGPD"). Fica na movimentação, não
    -- em veiculos: é dado de contato de quem deixou o carro NAQUELA visita,
    -- não do veículo em si — outra pessoa pode trazer o mesmo carro numa
    -- visita futura, e a retenção fica casada com a visita (expurga junto,
    -- se/quando o histórico for expurgado), não presa ao veículo indefinidamente.
    --
    -- NULL de propósito: telefone é fornecimento opcional (LGPD) — a ausência
    -- não pode impedir entrada, permanência, saída ou pagamento (ver
    -- CLAUDE.md). O agendador simplesmente não notifica quem não informou
    -- telefone.
    COMMENT ON COLUMN movimentacoes.telefone_contato IS
      'Telefone opcional informado na entrada, usado só para notificar permanência prolongada. Fornecimento opcional (LGPD) — ver CLAUDE.md.';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE movimentacoes
      DROP COLUMN telefone_contato;
  `);
};
