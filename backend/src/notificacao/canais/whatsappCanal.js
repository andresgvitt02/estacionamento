const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

// Implementação do canal WhatsApp para notificador.enviar() (ver
// ../notificador.js e CLAUDE.md, "Notificação automática"). Ninguém fora
// deste arquivo sabe que existe Baileys/WhatsApp aqui.
//
// Validado antes via scripts/spike-whatsapp.js (item 1 da ordem de
// implementação) — este arquivo é a versão reaproveitável daquele spike,
// com conexão persistida entre chamadas de enviar() em vez de conectar e
// encerrar a cada mensagem.

const AUTH_DIR = path.resolve(__dirname, '.baileys_auth');
// Baileys é barulhento no nível padrão (json log por evento interno) — fica
// em 'silent' aqui; troque via WHATSAPP_LOG_LEVEL no .env se precisar depurar
// a conexão (ex.: 'debug').
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' });

// Conexão é lazy (só abre na primeira enviar()) e reaproveitada entre
// chamadas dentro do mesmo processo — cada notificação não abre/derruba uma
// conexão nova.
let socketPromise = null;

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
            console.log('\n[notificador/whatsapp] Escaneie o QR Code com o WhatsApp do chip reserva:\n');
            qrcode.generate(qr, { small: true });
          }

          if (connection === 'open') {
            console.log('[notificador/whatsapp] Conectado.');
            resolve(sock);
          }

          if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const deslogado = statusCode === DisconnectReason.loggedOut;

            socketPromise = null;

            if (deslogado) {
              console.error(
                '[notificador/whatsapp] Sessão deslogada. Apague',
                AUTH_DIR,
                'e chame enviar() de novo para gerar um QR novo.'
              );
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
  const destinoNormalizado = destino.replace(/\D/g, '');

  const [resultado] = await sock.onWhatsApp(destinoNormalizado);
  if (!resultado?.exists) {
    throw new Error(`número ${destino} não encontrado no WhatsApp`);
  }

  await sock.sendMessage(resultado.jid, { text: mensagem });
}

module.exports = { enviar };
