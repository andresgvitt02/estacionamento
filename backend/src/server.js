require('dotenv').config();
const app = require('./app');
const agendador = require('./notificacao/agendador');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API do estacionamento rodando na porta ${PORT}`);
});

// Fica de fora do app.js de propósito, mesmo motivo do app.listen acima:
// suba supertest em cima de app.js não deve disparar cron nenhum.
agendador.iniciar();
