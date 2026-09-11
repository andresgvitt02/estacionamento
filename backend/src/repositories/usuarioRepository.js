const pool = require('../config/db');

// Acesso a dados de `usuarios`. CRUD simples — nenhuma regra de negócio aqui
// (ver camada de serviço). Sem DELETE físico: usuário é desativado (`ativo = false`),
// nunca removido, porque outras tabelas (movimentacoes, pagamentos, turnos,
// log_auditoria) referenciam usuario_id para trilha de auditoria.

async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY nome'
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// Inclui senha_hash — uso interno da autenticação, nunca deve ser exposto pela rota.
async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return rows[0] || null;
}

async function create({ nome, email, senhaHash, perfil = 'operador' }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, email, perfil, ativo, criado_em`,
    [nome, email, senhaHash, perfil]
  );
  return rows[0];
}

async function update(id, { nome, email, perfil }) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET nome = $2, email = $3, perfil = $4
     WHERE id = $1
     RETURNING id, nome, email, perfil, ativo, criado_em`,
    [id, nome, email, perfil]
  );
  return rows[0] || null;
}

async function desativar(id) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET ativo = false WHERE id = $1
     RETURNING id, nome, email, perfil, ativo, criado_em`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByEmail, create, update, desativar };
