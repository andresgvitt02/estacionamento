const path = require('path');
const fs = require('fs');
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

// Front e API ficam no mesmo domínio (em dev pelo proxy do Vite, em produção
// pelo express.static abaixo), então CORS só é necessário se o front for
// hospedado em outro domínio. Nesse caso, CORS_ORIGEM lista as origens
// permitidas separadas por vírgula. Sem a variável, nenhuma origem externa
// é liberada.
if (process.env.CORS_ORIGEM) {
  app.use(cors({ origin: process.env.CORS_ORIGEM.split(',').map((o) => o.trim()) }));
}
app.use(express.json());

// Health check para o provedor de hospedagem saber se a aplicação subiu.
// Fica antes da autenticação e não consulta o banco: só responde que o
// processo está vivo.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// /api/auth/login fica de fora do middleware de autenticação de propósito —
// é a única rota onde ainda não existe token. Todo o resto de /api exige um
// Bearer token válido (ver middlewares/autenticar.js).
app.use('/api/auth', authRoutes);
app.use('/api', autenticar, routes);

// Em produção o próprio Express entrega o build do React (frontend/dist):
// front e API no mesmo domínio, então o baseURL relativo '/api' do axios
// funciona sem CORS nem URL extra. Em dev a pasta pode não existir — aí o
// front roda pelo Vite e isto fica inativo.
const distFront = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distFront)) {
  app.use(express.static(distFront));
  // Fallback do React Router: qualquer GET fora de /api devolve o index.html
  // e o roteamento acontece no navegador. Caminho com extensão (.js, .png...)
  // fica de fora: arquivo que não existe tem que dar 404, não HTML — senão,
  // depois de um deploy, o navegador com cache velho recebe HTML no lugar do
  // JS antigo e a tela fica em branco.
  app.get(/^\/(?!api(\/|$))[^.]*$/, (req, res) => {
    res.sendFile(path.join(distFront, 'index.html'));
  });
}

app.use((req, res, next) => {
  next(new ApiError(404, 'rota não encontrada'));
});

app.use(errorHandler);

module.exports = app;
