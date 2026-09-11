/**
 * Prova de que a interface notificador.enviar() funciona de ponta a ponta,
 * agora passando pelo módulo reaproveitável (src/notificacao/), não mais
 * pelo spike descartável (spike-whatsapp.js).
 *
 * node scripts/testar-notificador.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const notificador = require('../src/notificacao/notificador');

const DESTINO = process.env.WHATSAPP_TESTE_DESTINO;

async function main() {
  if (!DESTINO) {
    console.error('Defina WHATSAPP_TESTE_DESTINO no .env antes de rodar.');
    process.exit(1);
  }

  try {
    await notificador.enviar(
      DESTINO,
      'Teste do notificador.enviar() — se chegou, a interface isolada está funcionando, não só o spike.'
    );
    console.log('[OK] notificador.enviar() funcionou.');
  } catch (err) {
    console.error('[FALHA]', err);
    process.exitCode = 1;
  }
}

main();
