const fs = require('fs');
const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const { normalizarTelefone } = require('../../utils/telefone');

// Implementação do canal WhatsApp para notificador.enviar() (ver
// ../notificador.js e CLAUDE.md, "Notificação automática"). Ninguém fora
// deste arquivo sabe que existe Baileys/WhatsApp aqui.
//
// Validado antes via scripts/spike-whatsapp.js (item 1 da ordem de
// implementação) — este arquivo é a versão reaproveitável daquele spike,
// com conexão persistida entre chamadas de enviar() em vez de conectar e
// encerrar a cada mensagem.

// Onde fica a sessão pareada. Em produção (Render) aponta para o disco
// persistente via WHATSAPP_AUTH_DIR — o resto do disco do Render é apagado a
// cada deploy e a sessão sumiria junto (ver docs/deploy.md). Tem que ser uma
// subpasta do disco, não o ponto de montagem em si: quando a sessão é
// deslogada a pasta inteira é apagada (ver limparSessao).
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR
  ? path.resolve(process.env.WHATSAPP_AUTH_DIR)
  : path.resolve(__dirname, '.baileys_auth');
// Baileys é barulhento no nível padrão (json log por evento interno) — fica
// em 'silent' aqui; troque via WHATSAPP_LOG_LEVEL no .env se precisar depurar
// a conexão (ex.: 'debug').
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' });

// Conexão é lazy (só abre na primeira enviar() ou quando o admin abre a tela
// do WhatsApp) e reaproveitada entre chamadas dentro do mesmo processo —
// cada notificação não abre/derruba uma conexão nova.
let socketPromise = null;

// Estado exposto para a tela do admin (ver status()): no servidor não há
// terminal para ver o QR, então ele fica guardado aqui até ser lido ou
// substituído pelo próximo (o WhatsApp gera um novo a cada ~20 s).
let conectado = false;
let qrAtual = null;

// Sessão deslogada (aparelho removido no celular) não volta: as credenciais
// gravadas não valem mais. Apagar a pasta faz a próxima conexão gerar um QR
// novo sem ninguém precisar mexer em arquivo no servidor.
function limparSessao() {
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}

function conectar() {
  if (socketPromise) return socketPromise;

  socketPromise = useMultiFileAuthState(AUTH_DIR).then(
    ({ state, saveCreds }) =>
      new Promise((resolve, reject) => {
        const sock = makeWASocket({ auth: state, logger, printQRInTerminal: false });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            qrAtual = qr;
            console.log(
              '\n[notificador/whatsapp] Escaneie o QR Code com o WhatsApp do chip reserva',
              '(ou abra a tela WhatsApp no sistema, logado como admin):\n'
            );
            qrcode.generate(qr, { small: true });
          }

          if (connection === 'open') {
            conectado = true;
            qrAtual = null;
            console.log('[notificador/whatsapp] Conectado.');
            resolve(sock);
          }

          if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const deslogado = statusCode === DisconnectReason.loggedOut;

            conectado = false;
            qrAtual = null;
            socketPromise = null;

            if (deslogado) {
              console.error(
                '[notificador/whatsapp] Sessão deslogada. Apagando',
                AUTH_DIR,
                '— a próxima conexão vai gerar um QR novo.'
              );
              limparSessao();
              reject(new Error('sessão do WhatsApp deslogada'));
            } else {
              console.log('[notificador/whatsapp] Conexão caiu, reconectando...');
              conectar().then(resolve, reject);
            }
          }
        });
      })
  );

  return socketPromise;
}

// Resolve o JID canônico antes de enviar. Números brasileiros têm o
// problema conhecido do "9º dígito": montar "${destino}@s.whatsapp.net" na
// marra pode gerar um JID que o servidor não reconhece pra aquele contato —
// a mensagem "sai" sem erro nenhum e nunca chega (foi o que aconteceu no
// primeiro teste do spike). onWhatsApp() pergunta ao servidor qual é o JID
// certo.
async function enviar(destino, mensagem) {
  const sock = await conectar();

  // Normaliza antes de perguntar ao servidor: onWhatsApp() só remove um '+'
  // inicial (confirmado no código do Baileys), não espaços/parênteses/hífen.
  // O campo de telefone não tem máscara (ver EntradaForm.jsx) — um número
  // digitado como "(51) 99999-8888" fazia essa consulta falhar sempre, mesmo
  // sendo válido, e a notificação nunca saía (bug encontrado em revisão).
  // Também acrescenta o 55 quando falta (telefones gravados antes de a
  // entrada passar a normalizar — ver utils/telefone.js).
  const destinoNormalizado = normalizarTelefone(destino) || String(destino).replace(/\D/g, '');

  const [resultado] = await sock.onWhatsApp(destinoNormalizado);
  if (!resultado?.exists) {
    throw new Error(`número ${destino} não encontrado no WhatsApp`);
  }

  await sock.sendMessage(resultado.jid, { text: mensagem });
}

// Para a tela do admin: dispara a conexão se ainda não houver uma (é assim
// que o QR aparece sem precisar esperar a primeira notificação) e devolve o
// estado atual. O QR vai como imagem (data URL) — gerado aqui, nunca por
// serviço externo, porque quem tiver o QR pareia o WhatsApp do chip.
async function status() {
  conectar().catch(() => {
    // Falha já aparece no console e no próximo status(); aqui só não pode
    // virar unhandled rejection.
  });

  const qr = qrAtual ? await QRCode.toDataURL(qrAtual, { margin: 2, width: 300 }) : null;
  return { conectado, qr };
}

module.exports = { enviar, status };
