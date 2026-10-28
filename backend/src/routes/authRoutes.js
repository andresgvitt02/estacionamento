const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../errors/ApiError');
const usuarioService = require('../services/usuarioService');

const router = express.Router();

// Única rota sob /api que não passa pelo middleware `autenticar` (ver
// app.js) — é justamente aqui que o token nasce.
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
      throw new ApiError(400, 'email e senha são obrigatórios');
    }

    const resultado = await usuarioService.autenticar({ email, senha });
    res.json(resultado);
  })
);

module.exports = router;
