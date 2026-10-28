const pool = require('../config/db');

// Acesso a dados de `vagas`. CRUD simples de cadastro (código, tipo, bloqueio) +
// a consulta que materializa a decisão "vaga não tem coluna ocupada" (ver
// CLAUDE.md e docs/modelagem-banco.md): ocupação é derivada de existir uma
// movimentação em aberto (saida IS NULL) apontando para a vaga. Isso é leitura
// de dados, não cálculo — por isso mora no repositório, não na service.

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM vagas ORDER BY codigo');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM vagas WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByCodigo(codigo) {
  const { rows } = await pool.query('SELECT * FROM vagas WHERE codigo = $1', [codigo]);
  return rows[0] || null;
}

// Mapa de vagas com status derivado: livre | ocupada (+ placa) | bloqueada.
// O front decide o mensalista/pcd/idoso a partir da coluna `tipo`.
async function listarComStatus() {
  const { rows } = await pool.query(`
    SELECT
      v.id,
      v.codigo,
      v.tipo,
      v.bloqueada,
      v.motivo_bloqueio,
      m.id AS movimentacao_id,
      m.entrada,
      ve.placa
    FROM vagas v
    LEFT JOIN movimentacoes m ON m.vaga_id = v.id AND m.saida IS NULL
    LEFT JOIN veiculos ve ON ve.id = m.veiculo_id
    ORDER BY v.codigo
  `);
  return rows;
}

async function create({ codigo, tipo = 'comum' }) {
  const { rows } = await pool.query(
    `INSERT INTO vagas (codigo, tipo) VALUES ($1, $2) RETURNING *`,
    [codigo, tipo]
  );
  return rows[0];
}

async function update(id, { codigo, tipo }) {
  const { rows } = await pool.query(
    `UPDATE vagas SET codigo = $2, tipo = $3 WHERE id = $1 RETURNING *`,
    [id, codigo, tipo]
  );
  return rows[0] || null;
}

async function bloquear(id, motivo) {
  const { rows } = await pool.query(
    `UPDATE vagas SET bloqueada = true, motivo_bloqueio = $2 WHERE id = $1 RETURNING *`,
    [id, motivo]
  );
  return rows[0] || null;
}

async function desbloquear(id) {
  const { rows } = await pool.query(
    `UPDATE vagas SET bloqueada = false, motivo_bloqueio = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByCodigo,
  listarComStatus,
  create,
  update,
  bloquear,
  desbloquear,
};
