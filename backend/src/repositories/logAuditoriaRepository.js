const pool = require('../config/db');

// Acesso a dados de `log_auditoria`. Só INSERT e leitura — log de auditoria
// não se edita nem se apaga. `detalhes` é um retrato (JSON) do estado
// relevante no momento da ação, decidido por quem chama (a service), não por
// este repositório.

async function registrar({ usuarioId = null, acao, entidade, entidadeId, detalhes = null }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO log_auditoria (usuario_id, acao, entidade, entidade_id, detalhes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [usuarioId, acao, entidade, entidadeId, detalhes]
  );
  return rows[0];
}

async function findByEntidade(entidade, entidadeId) {
  const { rows } = await pool.query(
    'SELECT * FROM log_auditoria WHERE entidade = $1 AND entidade_id = $2 ORDER BY criado_em DESC',
    [entidade, entidadeId]
  );
  return rows;
}

module.exports = { registrar, findByEntidade };
