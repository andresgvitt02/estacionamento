const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const pagamentoRepository = require('../repositories/pagamentoRepository');

const router = express.Router();

// Sem POST direto aqui de propósito: pagamento só nasce dentro da transação
// de saída (ver movimentacaoService.registrarSaida), nunca isolado.

router.get(
  '/movimentacao/:movimentacaoId',
  asyncHandler(async (req, res) => {
    res.json(await pagamentoRepository.findByMovimentacao(req.params.movimentacaoId));
  })
);

router.get(
  '/turno/:turnoId',
  asyncHandler(async (req, res) => {
    res.json(await pagamentoRepository.findByTurno(req.params.turnoId));
  })
);

module.exports = router;
