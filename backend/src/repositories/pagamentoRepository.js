const pool = require('../config/db');

// Acesso a dados de `pagamentos`. Só INSERT e leitura — sem UPDATE nem DELETE
// de propósito. Estorno nunca é DELETE (ver CLAUDE.md): é um novo registro,
// com estorno_de_id apontando para o pagamento revertido. `create` aceita um
// client opcional para participar da transação de saída aberta pela service.

// LEFT JOIN só pra trazer o nome de quem autorizou o estorno (autorizado_por_nome)
// em vez de só o id cru — mesmo motivo do join em logAuditoriaRepository.js.
// Pagamento normal não tem autorizado_por_id (fica NULL), por isso é LEFT e
// não INNER: não pode sumir da lista um pagamento que nunca foi estornado.
async function findByMovimentacao(movimentacaoId) {
  const { rows } = await pool.query(
    `SELECT p.*, u.nome AS autorizado_por_nome
     FROM pagamentos p
     LEFT JOIN usuarios u ON u.id = p.autorizado_por_id
     WHERE p.movimentacao_id = $1
     ORDER BY p.criado_em`,
    [movimentacaoId]
  );
  return rows;
}

// Aceita client opcional (default = pool) pelo mesmo motivo de `create`:
// turnoService.fechar precisa ler os pagamentos do turno de dentro da mesma
// transação que o fecha, pra não perder um pagamento registrado concorrentemente
// entre a leitura e o COMMIT.
async function findByTurno(turnoId, client = pool) {
  const { rows } = await client.query(
    'SELECT * FROM pagamentos WHERE turno_id = $1 ORDER BY criado_em',
    [turnoId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM pagamentos WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(
  {
    movimentacaoId,
    turnoId,
    forma,
    valor,
    valorRecebido = null,
    troco = null,
    estornoDeId = null,
    motivoEstorno = null,
    autorizadoPorId = null,
  },
  client = pool
) {
  const { rows } = await client.query(
    `INSERT INTO pagamentos
       (movimentacao_id, turno_id, forma, valor, valor_recebido, troco,
        estorno_de_id, motivo_estorno, autorizado_por_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [movimentacaoId, turnoId, forma, valor, valorRecebido, troco, estornoDeId, motivoEstorno, autorizadoPorId]
  );
  return rows[0];
}

module.exports = { findByMovimentacao, findByTurno, findById, create };
