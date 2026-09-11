const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const vagaRepository = require('../repositories/vagaRepository');

const router = express.Router();

// Mapa de vagas com status derivado (livre/ocupada/bloqueada) — é o que
// alimenta a tela principal do operador (ver CLAUDE.md "Interface").
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await vagaRepository.listarComStatus());
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vaga = await vagaRepository.findById(req.params.id);
    if (!vaga) throw new ApiError(404, 'vaga não encontrada');
    res.json(vaga);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const vaga = await vagaRepository.create(req.body);
    res.status(201).json(vaga);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const vaga = await vagaRepository.update(req.params.id, req.body);
    if (!vaga) throw new ApiError(404, 'vaga não encontrada');
    res.json(vaga);
  })
);

router.post(
  '/:id/bloquear',
  asyncHandler(async (req, res) => {
    const vaga = await vagaRepository.bloquear(req.params.id, req.body.motivo);
    if (!vaga) throw new ApiError(404, 'vaga não encontrada');
    res.json(vaga);
  })
);

router.post(
  '/:id/desbloquear',
  asyncHandler(async (req, res) => {
    const vaga = await vagaRepository.desbloquear(req.params.id);
    if (!vaga) throw new ApiError(404, 'vaga não encontrada');
    res.json(vaga);
  })
);

module.exports = router;
