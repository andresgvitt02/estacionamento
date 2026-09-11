const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const turnoRepository = require('../repositories/turnoRepository');
const turnoService = require('../services/turnoService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await turnoRepository.findAll());
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const turno = await turnoRepository.findById(req.params.id);
    if (!turno) throw new ApiError(404, 'turno não encontrado');
    res.json(turno);
  })
);

// usuarioId vem do token, nunca do body — mesmo princípio de "o servidor
// recalcula o valor, sempre" (CLAUDE.md), aplicado à identidade de quem abre
// o turno. Sem isso, qualquer requisição poderia abrir turno em nome de
// outro operador só mudando o body.
router.post(
  '/abrir',
  asyncHandler(async (req, res) => {
    const turno = await turnoService.abrir({ usuarioId: req.usuario.id, valorInicial: req.body.valorInicial });
    res.status(201).json(turno);
  })
);

// Fechamento de caixa — ver o "ATENÇÃO" em services/turnoService.js.
// usuarioId vem do token (quem está fechando), nunca do body.
router.post(
  '/:id/fechar',
  asyncHandler(async (req, res) => {
    const turno = await turnoService.fechar(req.params.id, {
      usuarioId: req.usuario.id,
      valorDeclarado: req.body.valorDeclarado,
      observacoes: req.body.observacoes,
    });
    res.json(turno);
  })
);

module.exports = router;
