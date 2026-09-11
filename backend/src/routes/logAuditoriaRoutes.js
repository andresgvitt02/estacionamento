const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const logAuditoriaRepository = require('../repositories/logAuditoriaRepository');

const router = express.Router();

// Só leitura — log de auditoria não se cria nem edita por aqui, é gravado
// internamente pelos services que executam a ação auditada.
router.get(
  '/:entidade/:entidadeId',
  asyncHandler(async (req, res) => {
    res.json(
      await logAuditoriaRepository.findByEntidade(req.params.entidade, req.params.entidadeId)
    );
  })
);

module.exports = router;
