const pool = require('../config/db');

// Consultas de agregação do módulo financeiro (item 6, CLAUDE.md). Leitura
// pura sobre o que outras peças já calcularam e gravaram (valor_cobrado,
// valor_esperado/declarado, pagamentos) — não decide nada de novo, só
// soma/agrupa, por isso não esbarra nas três reservas do projeto.

// Histórico de fechamento de caixa — só turnos já fechados, filtrados por
// data de FECHAMENTO (é quando o resultado passa a existir).
async function resumoTurnos({ inicio, fim }) {
  const { rows } = await pool.query(
    `SELECT t.id, t.usuario_id, u.nome AS usuario_nome, t.abertura, t.fechamento,
            t.valor_inicial, t.valor_esperado, t.valor_declarado,
            (t.valor_declarado - t.valor_esperado) AS divergencia,
            t.observacoes
     FROM turnos t
     JOIN usuarios u ON u.id = t.usuario_id
     WHERE t.fechamento IS NOT NULL
       AND t.fechamento BETWEEN $1 AND $2
     ORDER BY t.fechamento DESC`,
    [inicio, fim]
  );
  return rows;
}

// Extrato de movimentações finalizadas no período (filtra por data de SAÍDA,
// não de entrada — é quando o valor cobrado passa a existir).
async function movimentacoesPorPeriodo({ inicio, fim }) {
  const { rows } = await pool.query(
    `SELECT m.id, v.placa, va.codigo AS vaga_codigo, m.entrada, m.saida, m.valor_cobrado
     FROM movimentacoes m
     JOIN veiculos v ON v.id = m.veiculo_id
     JOIN vagas va ON va.id = m.vaga_id
     WHERE m.saida IS NOT NULL
       AND m.saida BETWEEN $1 AND $2
     ORDER BY m.saida DESC`,
    [inicio, fim]
  );
  return rows;
}

// Soma por forma de pagamento, líquida de estorno. Estorno grava valor
// sempre POSITIVO (CHECK no schema, ver migration 7) — é o estorno_de_id que
// diz que esse valor deve ser subtraído, não somado (mesma regra usada em
// turnoService.fechar pro fechamento de caixa).
async function totaisPorFormaPagamento({ inicio, fim }) {
  const { rows } = await pool.query(
    `SELECT forma,
            SUM(valor * CASE WHEN estorno_de_id IS NULL THEN 1 ELSE -1 END) AS total
     FROM pagamentos
     WHERE criado_em BETWEEN $1 AND $2
     GROUP BY forma
     ORDER BY forma`,
    [inicio, fim]
  );
  return rows;
}

module.exports = { resumoTurnos, movimentacoesPorPeriodo, totaisPorFormaPagamento };
