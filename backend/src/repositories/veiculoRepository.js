const pool = require('../config/db');

// Acesso a dados de `veiculos`. CRUD simples. Placa é campo de busca, não
// chave (ver CLAUDE.md) — por isso `findByPlaca` pode retornar mais de um
// veículo (histórico) e quem decide qual é "o" veículo atual é a service.

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM veiculos ORDER BY criado_em DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM veiculos WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByPlaca(placa) {
  const { rows } = await pool.query(
    'SELECT * FROM veiculos WHERE placa = $1 ORDER BY criado_em DESC',
    [placa]
  );
  return rows;
}

async function create({ placa, tipo = 'carro', modelo = null, cor = null }) {
  const { rows } = await pool.query(
    `INSERT INTO veiculos (placa, tipo, modelo, cor)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [placa, tipo, modelo, cor]
  );
  return rows[0];
}

async function update(id, { placa, tipo, modelo, cor }) {
  const { rows } = await pool.query(
    `UPDATE veiculos SET placa = $2, tipo = $3, modelo = $4, cor = $5
     WHERE id = $1
     RETURNING *`,
    [id, placa, tipo, modelo, cor]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByPlaca, create, update };
