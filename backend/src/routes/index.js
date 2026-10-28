const express = require('express');

const usuarioRoutes = require('./usuarioRoutes');
const veiculoRoutes = require('./veiculoRoutes');
const vagaRoutes = require('./vagaRoutes');
const tarifaRoutes = require('./tarifaRoutes');
const turnoRoutes = require('./turnoRoutes');
const movimentacaoRoutes = require('./movimentacaoRoutes');
const pagamentoRoutes = require('./pagamentoRoutes');
const logAuditoriaRoutes = require('./logAuditoriaRoutes');
const relatorioRoutes = require('./relatorioRoutes');

const router = express.Router();

router.use('/usuarios', usuarioRoutes);
router.use('/veiculos', veiculoRoutes);
router.use('/vagas', vagaRoutes);
router.use('/tarifas', tarifaRoutes);
router.use('/turnos', turnoRoutes);
router.use('/movimentacoes', movimentacaoRoutes);
router.use('/pagamentos', pagamentoRoutes);
router.use('/log-auditoria', logAuditoriaRoutes);
router.use('/relatorios', relatorioRoutes);

module.exports = router;
