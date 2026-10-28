/**
 * Smoke test manual dos relatórios do módulo financeiro (item 6) contra
 * Postgres de verdade — checa as agregações em relatorioRepository.js.
 *
 * Uso: node scripts/smoke-test-relatorios.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;
const token = jwt.sign({ sub: 1, nome: 'Operador Teste', perfil: 'operador' }, process.env.JWT_SECRET, {
  expiresIn: '1h',
});

let falhas = 0;
let total = 0;

function ok(descricao, condicao, extra) {
  total++;
  if (condicao) {
    console.log(`OK   - ${descricao}`);
  } else {
    falhas++;
    console.log(`FAIL - ${descricao}`, extra ?? '');
  }
}

async function chamar(caminho) {
  const resp = await fetch(BASE + caminho, { headers: { Authorization: `Bearer ${token}` } });
  let dados = null;
  try {
    dados = await resp.json();
  } catch {
    /* corpo vazio */
  }
  return { status: resp.status, dados };
}

async function main() {
  const semPeriodo = await chamar('/relatorios/turnos');
  ok('sem inicio/fim retorna 400', semPeriodo.status === 400, semPeriodo);

  const inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias atrás
  const fim = new Date(Date.now() + 60 * 1000).toISOString(); // agora + folga

  const turnos = await chamar(`/relatorios/turnos?inicio=${inicio}&fim=${fim}`);
  ok('relatorios/turnos responde 200 com lista', turnos.status === 200 && Array.isArray(turnos.dados), turnos);
  ok(
    'inclui o turno fechado pelo smoke test anterior, com usuario_nome e divergencia',
    turnos.dados?.some((t) => typeof t.usuario_nome === 'string' && 'divergencia' in t),
    turnos.dados
  );

  const movimentacoes = await chamar(`/relatorios/movimentacoes?inicio=${inicio}&fim=${fim}`);
  ok(
    'relatorios/movimentacoes responde 200 com lista',
    movimentacoes.status === 200 && Array.isArray(movimentacoes.dados),
    movimentacoes
  );
  ok(
    'cada item traz placa, vaga_codigo e valor_cobrado',
    movimentacoes.dados?.every((m) => 'placa' in m && 'vaga_codigo' in m && 'valor_cobrado' in m),
    movimentacoes.dados?.[0]
  );

  const porForma = await chamar(`/relatorios/pagamentos-por-forma?inicio=${inicio}&fim=${fim}`);
  ok(
    'relatorios/pagamentos-por-forma responde 200 agrupado por forma',
    porForma.status === 200 && Array.isArray(porForma.dados),
    porForma
  );
  ok('formas retornadas são válidas (dinheiro/pix/cartao)', porForma.dados?.every((p) => ['dinheiro', 'pix', 'cartao'].includes(p.forma)), porForma.dados);

  console.log('\n' + (falhas === 0 ? `TODOS OS ${total} CHECKS PASSARAM` : `${falhas}/${total} CHECK(S) FALHARAM`));
  process.exitCode = falhas === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('Erro inesperado no smoke test:', err);
  process.exitCode = 1;
});
