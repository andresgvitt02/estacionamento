require('dotenv').config();
const app = require('./app');
const agendador = require('./notificacao/agendador');

const PORT = process.env.PORT || 3000;

// Em produção, recusa subir com o segredo de exemplo do .env.example: com ele,
// qualquer um que leia o repositório consegue forjar um token de admin.
const SEGREDO_EXEMPLO = 'troque-este-valor-antes-de-usar-em-producao';
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === SEGREDO_EXEMPLO)
) {
  console.error('JWT_SECRET ausente ou com o valor de exemplo. Defina um segredo próprio antes de subir em produção.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API do estacionamento rodando na porta ${PORT}`);
});

// Fica de fora do app.js de propósito, mesmo motivo do app.listen acima:
// suba supertest em cima de app.js não deve disparar cron nenhum.
// NOTIFICACAO_ATIVA=false desliga o cron (ex.: no site público de demonstração,
// onde a sessão do WhatsApp não persiste). Sem a variável, segue ligado.
if (process.env.NOTIFICACAO_ATIVA !== 'false') {
  agendador.iniciar();
} else {
  console.log('Notificação automática desativada (NOTIFICACAO_ATIVA=false)');
}
