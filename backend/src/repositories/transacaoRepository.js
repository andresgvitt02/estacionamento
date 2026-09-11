const pool = require('../config/db');

// Único ponto do projeto autorizado a abrir transação manualmente
// (BEGIN/COMMIT/ROLLBACK). Fica no repositório, não na service, porque é a
// camada de repositório que tem autorização pra falar com o driver do banco
// (ver config/db.js e CLAUDE.md, "a camada de serviço não conhece Express nem
// o driver do banco").
//
// Uso (ver movimentacaoService.registrarSaida e turnoService.fechar):
//   await transacaoRepository.executar(async (client) => {
//     await algumRepositorio.fazerAlgo(dados, client);
//     await outroRepositorio.fazerOutraCoisa(dados, client);
//   });
// Cada repositório chamado dentro do callback já aceita um `client` opcional
// (default `= pool`) especificamente pra poder participar da mesma transação.
async function executar(tarefa) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await tarefa(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { executar };
