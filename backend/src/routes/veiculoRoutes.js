const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const veiculoRepository = require('../repositories/veiculoRepository');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (req.query.placa) {
      return res.json(await veiculoRepository.findByPlaca(req.query.placa));
    }
    res.json(await veiculoRepository.findAll());
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const veiculo = await veiculoRepository.findById(req.params.id);
    if (!veiculo) throw new ApiError(404, 'veículo não encontrado');
    res.json(veiculo);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const veiculo = await veiculoRepository.create(req.body);
    res.status(201).json(veiculo);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const veiculo = await veiculoRepository.update(req.params.id, req.body);
    if (!veiculo) throw new ApiError(404, 'veículo não encontrado');
    res.json(veiculo);
  })
);

module.exports = router;
