const cron = require('node-cron');
const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const notificador = require('./notificador');

// Item 7 da ordem de implementação (ver CLAUDE.md, "Notificação automática").
// Consulta periodicamente as movimentações abertas, identifica as que
// passaram do limite de permanência configurado e dispara a mensagem via
// notificador.enviar() — este arquivo não sabe, e não deve saber, que canal
// está por trás disso (hoje é WhatsApp, ver notificacao/notificador.js).
//
// Intervalo e limite são configuração (env), não constante no código (ver
// CLAUDE.md) — NOTIFICACAO_INTERVALO_CRON e NOTIFICACAO_LIMITE_HORAS já estão
// documentados em backend/.env.example.

function montarMensagem({ placa, entrada }) {
  const desde = new Date(entrada).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return (
    `Olá! O veículo placa ${placa} está estacionado desde ${desde} ` +
    `e já passou do tempo de permanência configurado. ` +
    `Qualquer dúvida, procure o operador no local.`
  );
}

// Cada movimentação é tratada de forma independente: falha (número inválido,
// canal fora do ar) numa não pode travar as outras nem derrubar o ciclo — só
// fica registrada no console e tenta de novo no próximo ciclo, porque
// notificado_em só é gravado em caso de sucesso.
async function processarCiclo() {
  const limiteHoras = Number(process.env.NOTIFICACAO_LIMITE_HORAS || 4);
  const limiteMinutos = limiteHoras * 60;

  const pendentes = await movimentacaoRepository.findAbertasParaNotificar(limiteMinutos);

  for (const movimentacao of pendentes) {
    try {
      await notificador.enviar(movimentacao.telefone_contato, montarMensagem(movimentacao));
      await movimentacaoRepository.marcarNotificada(movimentacao.id);
      console.log(`[notificacao/agendador] notificação enviada — movimentação ${movimentacao.id}`);
    } catch (erro) {
      console.error(
        `[notificacao/agendador] falha ao notificar movimentação ${movimentacao.id}:`,
        erro.message
      );
    }
  }
}

// Guarda a tarefa do node-cron pra permitir encerrar (ex.: em testes, ou num
// shutdown gracioso) sem deixar o processo preso.
let tarefa = null;

function iniciar() {
  if (tarefa) return tarefa;

  const expressao = process.env.NOTIFICACAO_INTERVALO_CRON || '*/15 * * * *';
  tarefa = cron.schedule(expressao, () => {
    processarCiclo().catch((erro) => {
      console.error('[notificacao/agendador] falha inesperada no ciclo:', erro);
    });
  });

  console.log(`[notificacao/agendador] iniciado (intervalo "${expressao}")`);
  return tarefa;
}

function parar() {
  if (!tarefa) return;
  tarefa.stop();
  tarefa = null;
}

module.exports = { iniciar, parar, processarCiclo };
