const pool = require('../config/db');

// Acesso a dados de `tarifas`. CRUD simples + a consulta de vigência (ver
// CLAUDE.md "Tarifa tem vigência temporal" e docs/modelagem-banco.md).
// Este repositório só busca e persiste linhas — decidir QUAL tarifa aplicar
// num cálculo, e o próprio cálculo do valor, é responsabilidade da
// tarifaService (propositalmente não escrita aqui, ver services/tarifaService.js).

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM tarifas ORDER BY data_inicio DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM tarifas WHERE id = $1', [id]);
  return rows[0] || null;
}

// Tarifa vigente numa data: data_inicio <= data E (sem data_fim OU data_fim > data).
async function buscarVigente(data = new Date()) {
  const { rows } = await pool.query(
    `SELECT * FROM tarifas
     WHERE data_inicio <= $1 AND (data_fim IS NULL OR data_fim > $1)
     ORDER BY data_inicio DESC
     LIMIT 1`,
    [data]
  );
  return rows[0] || null;
}

// percentualFracao/minutosFracao/arredondamento configuram a cobrança do
// tempo excedente e o arredondamento do valor final (ver migrations
// 1700000000009/1700000000010 e docs/modelagem-banco.md) — decisão do dono
// do estacionamento, por isso têm default e não são obrigatórios aqui.
async function create({
  descricao,
  valorHora,
  toleranciaMinutos = 0,
  percentualFracao = 100,
  minutosFracao = 60,
  arredondamento = 0.5,
  dataInicio,
}) {
  const { rows } = await pool.query(
    `INSERT INTO tarifas
       (descricao, valor_hora, tolerancia_minutos, percentual_fracao, minutos_fracao, arredondamento, data_inicio)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [descricao, valorHora, toleranciaMinutos, percentualFracao, minutosFracao, arredondamento, dataInicio]
  );
  return rows[0];
}

// Nunca edita valor_hora de uma tarifa existente (ver CLAUDE.md): só encerra
// a vigência atual. Trocar de preço é encerrar + create() de uma tarifa nova.
async function encerrarVigencia(id, dataFim = new Date()) {
  const { rows } = await pool.query(
    `UPDATE tarifas SET data_fim = $2 WHERE id = $1 RETURNING *`,
    [id, dataFim]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, buscarVigente, create, encerrarVigencia };
