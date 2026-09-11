const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const tarifaRepository = require('../repositories/tarifaRepository');
const tarifaService = require('../services/tarifaService');
const { validarNovaTarifa } = require('../validators/tarifaValidator');
const exigirPerfil = require('../middlewares/exigirPerfil');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await tarifaRepository.findAll());
  })
);

router.get(
  '/vigente',
  asyncHandler(async (req, res) => {
    const tarifa = await tarifaRepository.buscarVigente();
    if (!tarifa) throw new ApiError(404, 'nenhuma tarifa vigente cadastrada');
    res.json(tarifa);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tarifa = await tarifaRepository.findById(req.params.id);
    if (!tarifa) throw new ApiError(404, 'tarifa não encontrada');
    res.json(tarifa);
  })
);

// Nunca edita a tarifa vigente: encerra a atual e cria uma nova linha
// (ver CLAUDE.md "Tarifa tem vigência temporal"). Por isso não há PUT aqui.
// Preço é decisão do dono do estacionamento — restrito a admin.
router.post(
  '/',
  exigirPerfil('admin'),
  validarNovaTarifa,
  asyncHandler(async (req, res) => {
    const tarifa = await tarifaService.definirNovaTarifa(req.body);
    res.status(201).json(tarifa);
  })
);

module.exports = router;
