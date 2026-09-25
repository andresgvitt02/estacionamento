/**
 * Popula um banco recém-migrado com o mínimo pra dar pra operar: vagas
 * (comum/PCD/idoso/mensalista) e uma tarifa vigente. Sem isso o mapa de
 * vagas sobe vazio e o registro de entrada falha (nenhuma vaga pra
 * escolher, nenhuma tarifa pra calcular o valor).
 *
 * Idempotente: roda de novo sem duplicar — pula vaga cujo código já existe
 * e só cria tarifa se não houver nenhuma vigente ainda (repetir criaria
 * tarifa nova encerrando a anterior sem necessidade, ver tarifaService).
 *
 * Não cria usuário admin — isso é o scripts/criar-admin.js, que pede
 * nome/email/senha na linha de comando em vez de fixar credencial no
 * código (o SGBD já ficaria idêntico a uma instalação real: rodar
 * migrate:up, depois criar-admin.js, depois este script).
 *
 * Uso:
 *   node scripts/seed-demo.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const vagaRepository = require('../src/repositories/vagaRepository');
const tarifaRepository = require('../src/repositories/tarifaRepository');
const tarifaService = require('../src/services/tarifaService');
const pool = require('../src/config/db');

const VAGAS = [
  { codigo: 'A01', tipo: 'comum' },
  { codigo: 'A02', tipo: 'comum' },
  { codigo: 'A03', tipo: 'comum' },
  { codigo: 'A04', tipo: 'comum' },
  { codigo: 'A05', tipo: 'comum' },
  { codigo: 'A06', tipo: 'comum' },
  { codigo: 'A07', tipo: 'comum' },
  { codigo: 'PCD1', tipo: 'pcd' },
  { codigo: 'IDO1', tipo: 'idoso' },
  { codigo: 'MEN1', tipo: 'mensalista' },
];

async function semearVagas() {
  let criadas = 0;
  for (const vaga of VAGAS) {
    const existente = await vagaRepository.findByCodigo(vaga.codigo);
    if (existente) continue;
    await vagaRepository.create(vaga);
    criadas += 1;
  }
  console.log(`Vagas: ${criadas} criadas, ${VAGAS.length - criadas} já existiam.`);
}

async function semearTarifa() {
  const vigente = await tarifaRepository.buscarVigente();
  if (vigente) {
    console.log(`Tarifa: já existe uma vigente ("${vigente.descricao}") — nada a fazer.`);
    return;
  }
  // Valores só de demonstração — quem decide a tabela real é o dono do
  // estacionamento, cadastrando pela tela de Tarifas.
  const tarifa = await tarifaService.definirNovaTarifa({
    descricao: 'Tabela padrão (seed de demonstração)',
    valorHora: 6,
    toleranciaMinutos: 10,
    percentualFracao: 50,
    minutosFracao: 30,
    arredondamento: 0.5,
  });
  console.log(`Tarifa: criada "${tarifa.descricao}" a ${tarifa.valor_hora}/hora.`);
}

async function main() {
  await semearVagas();
  await semearTarifa();
}

main()
  .catch((err) => {
    console.error('Falha ao semear dados de demonstração:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
