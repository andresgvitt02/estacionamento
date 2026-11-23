const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const exigirPerfil = require('../middlewares/exigirPerfil');
const notificador = require('../notificacao/notificador');

const router = express.Router();

// Só admin: o QR devolvido aqui pareia o WhatsApp do chip do
// estacionamento — quem o lê passa a mandar mensagem em nome dele.
router.get(
  '/status',
  exigirPerfil('admin'),
  asyncHandler(async (req, res) => {
    res.json(await notificador.status());
  })
);

module.exports = router;
