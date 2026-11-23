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

// Estado da conexão do canal ({ conectado, qr }) para a tela de
// administração. O formato é genérico de propósito: um canal sem QR (e-mail,
// por exemplo) devolveria qr: null.
async function status() {
  return canal.status();
}

module.exports = { enviar, status };
