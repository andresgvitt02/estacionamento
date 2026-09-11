const ApiError = require('../errors/ApiError');

// Validação de payload da rota POST /tarifas. Puro CRUD/boilerplate — não é
// a fórmula de cálculo (essa está em services/tarifaService.js). Fica antes
// da service pra devolver 400 com mensagem legível em vez do erro cru do
// banco (CHECK constraint) ou de "NaN" silencioso indo pro SQL.

function ehNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

// Constrói a lista de erros em vez de parar no primeiro, pra quem estiver
// montando o formulário (ver telas do frontend) já saber tudo que precisa
// corrigir de uma vez.
function validarNovaTarifa(req, res, next) {
  const {
    descricao,
    valorHora,
    toleranciaMinutos,
    percentualFracao,
    minutosFracao,
    arredondamento,
    dataInicio,
  } = req.body;

  const erros = [];

  if (typeof descricao !== 'string' || !descricao.trim()) {
    erros.push('descricao é obrigatória');
  }

  if (!ehNumero(valorHora) || valorHora <= 0) {
    erros.push('valorHora deve ser um número maior que zero');
  }

  if (toleranciaMinutos !== undefined && (!Number.isInteger(toleranciaMinutos) || toleranciaMinutos < 0)) {
    erros.push('toleranciaMinutos deve ser um número inteiro maior ou igual a zero');
  }

  if (percentualFracao !== undefined && (!ehNumero(percentualFracao) || percentualFracao <= 0)) {
    erros.push('percentualFracao deve ser um número maior que zero');
  }

  if (minutosFracao !== undefined && (!Number.isInteger(minutosFracao) || minutosFracao <= 0)) {
    erros.push('minutosFracao deve ser um número inteiro maior que zero');
  }

  if (arredondamento !== undefined && (!ehNumero(arredondamento) || arredondamento <= 0)) {
    erros.push('arredondamento deve ser um número maior que zero');
  }

  if (dataInicio !== undefined && Number.isNaN(new Date(dataInicio).getTime())) {
    erros.push('dataInicio, se informado, deve ser uma data válida');
  }

  if (erros.length > 0) {
    throw new ApiError(400, erros.join('; '));
  }

  next();
}

module.exports = { validarNovaTarifa };
