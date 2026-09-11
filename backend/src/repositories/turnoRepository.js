const pool = require('../config/db');

// Acesso a dados de `turnos`. CRUD simples de abertura/consulta. `fechar` só
// persiste os valores que a service calcular (valor_esperado é a soma dos
// pagamentos em dinheiro do turno — a regra de cálculo do fechamento de caixa
// mora em turnoService.fechar, ver o "ATENÇÃO" lá).

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM turnos ORDER BY abertura DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM turnos WHERE id = $1', [id]);
  return rows[0] || null;
}

// Índice único garante, no banco, que não existam dois turnos abertos para o
// mesmo usuário — esta consulta é o espelho disso na aplicação.
async function findAbertoPorUsuario(usuarioId) {
  const { rows } = await pool.query(
    'SELECT * FROM turnos WHERE usuario_id = $1 AND fechamento IS NULL',
    [usuarioId]
  );
  return rows[0] || null;
}

async function abrir({ usuarioId, valorInicial = 0 }) {
  const { rows } = await pool.query(
    `INSERT INTO turnos (usuario_id, valor_inicial)
     VALUES ($1, $2)
     RETURNING *`,
    [usuarioId, valorInicial]
  );
  return rows[0];
}

// Persiste o fechamento com os valores já calculados pela service
// (valorEsperado = soma dos pagamentos; valorDeclarado = contagem do operador).
// `WHERE fechamento IS NULL` pelo mesmo motivo do UPDATE de saída em
// movimentacaoRepository: a trava contra fechar duas vezes mora na query, não
// numa checagem separada que poderia perder uma corrida. `client` opcional
// pra participar da transação aberta pela service (ver transacaoRepository).
async function fechar(id, { fechamento = new Date(), valorEsperado, valorDeclarado, observacoes }, client = pool) {
  const { rows } = await client.query(
    `UPDATE turnos
     SET fechamento = $2, valor_esperado = $3, valor_declarado = $4, observacoes = $5
     WHERE id = $1 AND fechamento IS NULL
     RETURNING *`,
    [id, fechamento, valorEsperado, valorDeclarado, observacoes]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findAbertoPorUsuario, abrir, fechar };
