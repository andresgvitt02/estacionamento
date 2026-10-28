const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const movimentacaoService = require('../services/movimentacaoService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await movimentacaoRepository.findAll());
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const movimentacao = await movimentacaoRepository.findById(req.params.id);
    if (!movimentacao) throw new ApiError(404, 'movimentação não encontrada');
    res.json(movimentacao);
  })
);

// usuarioId vem do token (req.usuario), nunca do body — o turno é derivado
// internamente pela service a partir dele (ver movimentacaoService.js).
router.post(
  '/entrada',
  asyncHandler(async (req, res) => {
    const movimentacao = await movimentacaoService.registrarEntrada({
      veiculo: req.body.veiculo,
      vagaId: req.body.vagaId,
      usuarioId: req.usuario.id,
      telefoneContato: req.body.telefoneContato,
    });
    res.status(201).json(movimentacao);
  })
);

// Preview de valor pra tela de saída — não fecha nada, só recalcula "quanto
// seria agora" (ver movimentacaoService.estimarValor).
router.get(
  '/:id/valor-estimado',
  asyncHandler(async (req, res) => {
    res.json(await movimentacaoService.estimarValor(req.params.id));
  })
);

// Saída — ver o "ATENÇÃO" em services/movimentacaoService.js.
// Corpo esperado: { pagamentos: [{ forma, valor, valorRecebido? }], idempotencyKey }.
// Nenhum valor cobrado vem daqui — é sempre recalculado no servidor (CLAUDE.md
// "O servidor recalcula o valor. Sempre."). usuarioId vem do token, nunca do
// body — mesmo padrão da entrada.
router.post(
  '/:id/saida',
  asyncHandler(async (req, res) => {
    const movimentacao = await movimentacaoService.registrarSaida({
      movimentacaoId: req.params.id,
      usuarioId: req.usuario.id,
      pagamentos: req.body.pagamentos,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.json(movimentacao);
  })
);

module.exports = router;
