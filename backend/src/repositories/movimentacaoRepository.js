const pool = require('../config/db');

// Acesso a dados de `movimentacoes`. Cada função aqui é uma única instrução
// SQL — nenhuma delas abre transação. A orquestração da saída (calcular valor
// → registrar pagamento → liberar vaga, tudo ou nada, ver CLAUDE.md "Saída é
// transação atômica") é responsabilidade da service (ver o "ATENÇÃO" em
// movimentacaoService.js), que envolve as chamadas a este e a outros
// repositórios numa transação via transacaoRepository.executar.

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM movimentacoes ORDER BY entrada DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM movimentacoes WHERE id = $1', [id]);
  return rows[0] || null;
}

// Espelha o índice parcial único idx_movimentacoes_vaga_unica_aberta.
async function findAbertaPorVaga(vagaId) {
  const { rows } = await pool.query(
    'SELECT * FROM movimentacoes WHERE vaga_id = $1 AND saida IS NULL',
    [vagaId]
  );
  return rows[0] || null;
}

// Espelha o índice parcial único idx_movimentacoes_veiculo_unica_aberta.
async function findAbertaPorVeiculo(veiculoId) {
  const { rows } = await pool.query(
    'SELECT * FROM movimentacoes WHERE veiculo_id = $1 AND saida IS NULL',
    [veiculoId]
  );
  return rows[0] || null;
}

async function registrarEntrada({ veiculoId, vagaId, tarifaId, turnoId, usuarioId, telefoneContato = null }) {
  const { rows } = await pool.query(
    `INSERT INTO movimentacoes (veiculo_id, vaga_id, tarifa_id, turno_entrada_id, usuario_entrada_id, telefone_contato)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [veiculoId, vagaId, tarifaId, turnoId, usuarioId, telefoneContato]
  );
  return rows[0];
}

// Só persiste os valores que a service já calculou e decidiu (valorCobrado
// vem do cálculo de tarifa, não deve ser recebido do cliente — ver CLAUDE.md
// "O servidor recalcula o valor. Sempre.").
//
// `WHERE saida IS NULL` faz este UPDATE ser, ele mesmo, a trava de
// concorrência: duas requisições pra mesma movimentação nunca fecham as duas
// (a segunda afeta 0 linhas). `idempotencyKey` é uma segunda trava,
// independente da primeira — o índice único parcial da migration 12 rejeita
// (unique_violation, ver errorHandler) reenvio com o mesmo token mesmo que
// fosse pra outra movimentação.
async function registrarSaida(
  id,
  { saida = new Date(), valorCobrado, turnoSaidaId, usuarioSaidaId, idempotencyKey = null },
  client = pool
) {
  const { rows } = await client.query(
    `UPDATE movimentacoes
     SET saida = $2, valor_cobrado = $3, turno_saida_id = $4, usuario_saida_id = $5, idempotency_key = $6
     WHERE id = $1 AND saida IS NULL
     RETURNING *`,
    [id, saida, valorCobrado, turnoSaidaId, usuarioSaidaId, idempotencyKey]
  );
  return rows[0] || null;
}

async function marcarNotificada(id, notificadoEm = new Date()) {
  const { rows } = await pool.query(
    'UPDATE movimentacoes SET notificado_em = $2 WHERE id = $1 RETURNING *',
    [id, notificadoEm]
  );
  return rows[0] || null;
}

// Alimenta o agendador (ver notificacao/agendador.js): movimentações ainda
// abertas (saida IS NULL), que já passaram do limite de permanência
// configurado, que têm telefone de contato (sem telefone não há pra quem
// mandar — ver CLAUDE.md "LGPD", fornecimento opcional) e que ainda não foram
// notificadas (notificado_em IS NULL) — é essa última condição que impede o
// agendador de reenviar a cada ciclo.
async function findAbertasParaNotificar(limiteMinutos) {
  const { rows } = await pool.query(
    `SELECT m.*, v.placa
     FROM movimentacoes m
     JOIN veiculos v ON v.id = m.veiculo_id
     WHERE m.saida IS NULL
       AND m.notificado_em IS NULL
       AND m.telefone_contato IS NOT NULL
       AND m.entrada <= now() - ($1 || ' minutes')::interval`,
    [limiteMinutos]
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findAbertaPorVaga,
  findAbertaPorVeiculo,
  registrarEntrada,
  registrarSaida,
  marcarNotificada,
  findAbertasParaNotificar,
};
