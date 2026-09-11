const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const relatorioRepository = require('../repositories/relatorioRepository');

const router = express.Router();

// "inicio"/"fim" são obrigatórios e vêm sempre da query string — não tem
// período default escondido no código (mesma filosofia do intervalo do
// agendador, ver CLAUDE.md "Notificação automática": configuração, não
// constante). Quem decide "hoje", "este mês" etc. é a tela.
function periodoDaQuery(req) {
  const { inicio, fim } = req.query;
  if (!inicio || !fim) throw new ApiError(400, 'informe "inicio" e "fim" (datas ISO) na query string');

  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);
  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
    throw new ApiError(400, '"inicio"/"fim" precisam ser datas válidas');
  }
  return { inicio: dataInicio, fim: dataFim };
}

router.get(
  '/turnos',
  asyncHandler(async (req, res) => {
    res.json(await relatorioRepository.resumoTurnos(periodoDaQuery(req)));
  })
);

router.get(
  '/movimentacoes',
  asyncHandler(async (req, res) => {
    res.json(await relatorioRepository.movimentacoesPorPeriodo(periodoDaQuery(req)));
  })
);

router.get(
  '/pagamentos-por-forma',
  asyncHandler(async (req, res) => {
    res.json(await relatorioRepository.totaisPorFormaPagamento(periodoDaQuery(req)));
  })
);

module.exports = router;
