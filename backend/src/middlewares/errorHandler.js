const ApiError = require('../errors/ApiError');

// Traduz violações comuns do Postgres pra status HTTP, sem cada rota precisar
// saber o código de erro do driver `pg`. Ver códigos em
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_STATUS_POR_CODIGO = {
  '23505': 409, // unique_violation — ex.: placa duplicada onde há índice único, código de vaga repetido
  '23503': 409, // foreign_key_violation — referência a um id que não existe
  '23514': 400, // check_violation — ex.: tentativa de burlar uma regra garantida no schema
};

// Precisa dos 4 parâmetros — é assim que o Express reconhece um error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ erro: err.message });
  }

  const statusPg = PG_STATUS_POR_CODIGO[err.code];
  if (statusPg) {
    return res.status(statusPg).json({ erro: err.detail || err.message });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno' });
}

module.exports = errorHandler;
