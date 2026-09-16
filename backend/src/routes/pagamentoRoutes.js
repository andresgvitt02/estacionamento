const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const pagamentoRepository = require('../repositories/pagamentoRepository');
const pagamentoService = require('../services/pagamentoService');
const exigirPerfil = require('../middlewares/exigirPerfil');

const router = express.Router();

// Sem POST direto aqui de propósito: pagamento normal só nasce dentro da
// transação de saída (ver movimentacaoService.registrarSaida), nunca
// isolado. A única escrita fora dali é o estorno abaixo — restrito a admin,
// já que "autorizado_por_id" (CLAUDE.md, trilha de auditoria) precisa ser
// alguém com autoridade pra reverter dinheiro, não o mesmo operador do caixa.

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

router.post(
  '/:id/estornar',
  exigirPerfil('admin'),
  asyncHandler(async (req, res) => {
    const estorno = await pagamentoService.estornar(req.params.id, {
      usuarioId: req.usuario.id,
      motivo: req.body.motivo,
    });
    res.status(201).json(estorno);
  })
);

module.exports = router;
