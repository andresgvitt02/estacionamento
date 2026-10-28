// Interface única que o resto do sistema usa para mandar notificação (ver
// CLAUDE.md, "Notificação automática"). A service que dispara o alerta de
// permanência prolongada (item 7 da ordem de implementação, ainda não
// escrita) chama só isto — não sabe, e não deve saber, se por baixo é
// WhatsApp, Telegram ou e-mail.
//
// Trocar de canal é trocar a implementação: hoje é sempre whatsappCanal;
// quando existir um segundo canal, este require vira uma escolha por
// configuração (ex.: process.env.NOTIFICACAO_CANAL).
const canal = require('./canais/whatsappCanal');

async function enviar(destino, mensagem) {
  return canal.enviar(destino, mensagem);
}

module.exports = { enviar };
