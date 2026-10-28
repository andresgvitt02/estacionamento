/**
 * Bootstrap do primeiro usuário admin. Necessário porque POST /api/usuarios
 * agora exige perfil admin (ver routes/usuarioRoutes.js) — sem isso, não tem
 * como criar o primeiro usuário pela API. Este script fala direto com a
 * service, sem passar pela rota HTTP, então não esbarra nessa restrição.
 *
 * Uso:
 *   node scripts/criar-admin.js "Nome Completo" email@exemplo.com senha123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const usuarioService = require('../src/services/usuarioService');
const pool = require('../src/config/db');

const [, , nome, email, senha] = process.argv;

async function main() {
  if (!nome || !email || !senha) {
    console.error('Uso: node scripts/criar-admin.js "Nome Completo" email@exemplo.com senha123');
    process.exitCode = 1;
    return;
  }

  const usuario = await usuarioService.criar({ nome, email, senha, perfil: 'admin' });
  console.log('Admin criado:', usuario);
}

main()
  .catch((err) => {
    console.error('Falha ao criar admin:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
