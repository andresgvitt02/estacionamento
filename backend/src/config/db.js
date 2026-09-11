const { Pool } = require('pg');
require('dotenv').config();

// Pool único de conexões, compartilhado pelos repositórios.
// A camada de serviço nunca importa este módulo diretamente — só os repositórios,
// que são a única camada autorizada a falar com o banco (ver CLAUDE.md).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // Erro em cliente ocioso do pool (ex.: conexão derrubada pelo servidor).
  // Loga e deixa o processo continuar — não derruba o servidor por isso.
  console.error('Erro inesperado no pool de conexões do PostgreSQL', err);
});

module.exports = pool;
