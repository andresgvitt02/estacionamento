const notificador = require('./notificador');

// Mensagem enviada assim que a entrada é registrada com telefone: confirma
// para o cliente que o número está certo (se não chegar, o operador corrige
// na hora, com o cliente ainda ali) e informa para que o telefone será usado
// (finalidade — ver CLAUDE.md "LGPD").

// O limite vem da mesma configuração do agendador (NOTIFICACAO_LIMITE_HORAS),
// para a mensagem nunca prometer um prazo diferente do que o sistema usa.
function descreverLimite(limiteHoras) {
  if (Number.isInteger(limiteHoras) && limiteHoras >= 1) {
    return limiteHoras === 1 ? '1 hora' : `${limiteHoras} horas`;
  }
  const minutos = Math.round(limiteHoras * 60);
  return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
}

function montarMensagem({ placa, entrada, limiteHoras }) {
  const quando = new Date(entrada);
  const fuso = { timeZone: 'America/Sao_Paulo' };
  const data = quando.toLocaleDateString('pt-BR', fuso);
  const hora = quando.toLocaleTimeString('pt-BR', { ...fuso, hour: '2-digit', minute: '2-digit' });
  return (
    `Olá! Seu veículo placa ${placa} entrou no estacionamento em ${data} às ${hora}. ` +
    `Vamos te avisar por aqui se ele passar de ${descreverLimite(limiteHoras)} estacionado. ` +
    `Qualquer dúvida, procure o operador no local.`
  );
}

// Não devolve a promessa do envio de propósito: quem registra a entrada não
// espera o WhatsApp (que pode estar lento ou desconectado, esperando QR) e
// uma falha aqui nunca desfaz a entrada — telefone é opcional e a
// notificação é um extra, não parte da operação (ver CLAUDE.md "LGPD").
function enviarConfirmacao({ placa, entrada, telefone }) {
  if (!telefone || process.env.NOTIFICACAO_ATIVA === 'false') return;

  const limiteHoras = Number(process.env.NOTIFICACAO_LIMITE_HORAS || 4);
  notificador
    .enviar(telefone, montarMensagem({ placa, entrada, limiteHoras }))
    .then(() => console.log(`[notificacao/entrada] confirmação enviada — placa ${placa}`))
    .catch((erro) =>
      console.error(`[notificacao/entrada] falha ao enviar confirmação — placa ${placa}:`, erro.message)
    );
}

module.exports = { enviarConfirmacao, montarMensagem, descreverLimite };
