const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const usuarioRepository = require('../repositories/usuarioRepository');
const usuarioService = require('../services/usuarioService');
const exigirPerfil = require('../middlewares/exigirPerfil');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await usuarioRepository.findAll());
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const usuario = await usuarioRepository.findById(req.params.id);
    if (!usuario) throw new ApiError(404, 'usuário não encontrado');
    res.json(usuario);
  })
);

// Cadastro/edição/desativação de usuário fica restrito a admin — qualquer
// operador poder criar contas (inclusive admin) seria escalação de
// privilégio de graça.
router.post(
  '/',
  exigirPerfil('admin'),
  asyncHandler(async (req, res) => {
    const usuario = await usuarioService.criar(req.body);
    res.status(201).json(usuario);
  })
);

router.put(
  '/:id',
  exigirPerfil('admin'),
  asyncHandler(async (req, res) => {
    const usuario = await usuarioRepository.update(req.params.id, req.body);
    if (!usuario) throw new ApiError(404, 'usuário não encontrado');
    res.json(usuario);
  })
);

router.post(
  '/:id/desativar',
  exigirPerfil('admin'),
  asyncHandler(async (req, res) => {
    const usuario = await usuarioRepository.desativar(req.params.id);
    if (!usuario) throw new ApiError(404, 'usuário não encontrado');
    res.json(usuario);
  })
);

module.exports = router;
