const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const autenticar = require('./middlewares/autenticar');
const errorHandler = require('./middlewares/errorHandler');
const ApiError = require('./errors/ApiError');

// App separado do server.js de propósito: permite subir o Express (com
// supertest, por exemplo) sem abrir uma porta de verdade, pra testes de rota.
const app = express();

app.use(cors());
app.use(express.json());

// /api/auth/login fica de fora do middleware de autenticação de propósito —
// é a única rota onde ainda não existe token. Todo o resto de /api exige um
// Bearer token válido (ver middlewares/autenticar.js).
app.use('/api/auth', authRoutes);
app.use('/api', autenticar, routes);

app.use((req, res, next) => {
  next(new ApiError(404, 'rota não encontrada'));
});

app.use(errorHandler);

module.exports = app;
