/**
 * Smoke test manual do fluxo entrada → saída → fechamento de caixa contra um
 * Postgres de verdade (não mock) — cobre as duas peças escritas a pedido do
 * autor (ver "ATENÇÃO" em movimentacaoService.js e turnoService.js) rodando
 * de ponta a ponta pela API HTTP, exatamente como o front chamaria.
 *
 * Pré-requisitos: servidor rodando (`npm start`/`npm run dev`), migrations
 * em dia, pelo menos uma vaga livre chamada "A03", uma tarifa vigente
 * cadastrada, e os usuários de id 1 (operador) e 2 (perfil admin) existentes
 * no banco. Gera os próprios tokens JWT (sem precisar de login/senha) —
 * assinados com o mesmo JWT_SECRET do .env, então só funciona localmente.
 *
 * ATENÇÃO: registra e fecha movimentação/turno de verdade no banco apontado
 * por DATABASE_URL. Não rodar contra produção.
 *
 * Uso: node scripts/smoke-test-saida-fechamento.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;
const tokenOperador = jwt.sign({ sub: 1, nome: 'Operador Teste', perfil: 'operador' }, process.env.JWT_SECRET, {
  expiresIn: '1h',
});
const tokenAdmin = jwt.sign({ sub: 2, nome: 'Admin Teste', perfil: 'admin' }, process.env.JWT_SECRET, {
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

async function chamar(metodo, caminho, token, body) {
  const resp = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let dados = null;
  try {
    dados = await resp.json();
  } catch {
    /* corpo vazio */
  }
  return { status: resp.status, dados };
}

async function main() {
  const vagas = await chamar('GET', '/vagas', tokenOperador);
  const vagaLivre = vagas.dados.find((v) => v.codigo === 'A03');
  ok('vaga A03 existe e está livre antes do teste', vagaLivre && !vagaLivre.movimentacao_id, vagaLivre);

  const placa = 'SMK' + Math.floor(Math.random() * 1000);
  const entrada = await chamar('POST', '/movimentacoes/entrada', tokenOperador, {
    veiculo: { placa, tipo: 'carro' },
    vagaId: vagaLivre.id,
  });
  ok('entrada registrada (201)', entrada.status === 201, entrada);
  const movimentacaoId = entrada.dados?.id;

  const vagasDepoisEntrada = await chamar('GET', '/vagas', tokenOperador);
  const vagaOcupada = vagasDepoisEntrada.dados.find((v) => v.id === vagaLivre.id);
  ok(
    'vaga aparece ocupada logo após a entrada (sem coluna ocupada, é derivado)',
    vagaOcupada.movimentacao_id === movimentacaoId,
    vagaOcupada
  );

  const entradaDuplicada = await chamar('POST', '/movimentacoes/entrada', tokenOperador, {
    veiculo: { placa: 'OUT9Z99', tipo: 'carro' },
    vagaId: vagaLivre.id,
  });
  ok('vaga já ocupada rejeita segunda entrada (409)', entradaDuplicada.status === 409, entradaDuplicada);

  const preview = await chamar('GET', `/movimentacoes/${movimentacaoId}/valor-estimado`, tokenOperador);
  ok(
    'valor-estimado responde 200 com valorEstimado numérico',
    preview.status === 200 && typeof preview.dados.valorEstimado === 'number',
    preview
  );
  const valorDevido = preview.dados.valorEstimado;

  const semToken = await chamar('POST', `/movimentacoes/${movimentacaoId}/saida`, tokenOperador, {
    pagamentos: [{ forma: 'pix', valor: valorDevido }],
  });
  ok('saída sem idempotencyKey é rejeitada (400)', semToken.status === 400, semToken);

  const somaErrada = await chamar('POST', `/movimentacoes/${movimentacaoId}/saida`, tokenOperador, {
    pagamentos: [{ forma: 'pix', valor: 0.01 }],
    idempotencyKey: 'tok-soma-errada',
  });
  ok(
    'soma de pagamentos que não bate com o valor devido é rejeitada (422)',
    somaErrada.status === 422,
    somaErrada
  );

  const idempotencyKey = 'tok-smoke-' + Date.now();
  const metadeDinheiro = Math.floor((valorDevido / 2) * 100) / 100;
  const restoPix = Math.round((valorDevido - metadeDinheiro) * 100) / 100;
  const saida = await chamar('POST', `/movimentacoes/${movimentacaoId}/saida`, tokenOperador, {
    pagamentos: [
      { forma: 'dinheiro', valor: metadeDinheiro, valorRecebido: metadeDinheiro + 5 },
      { forma: 'pix', valor: restoPix },
    ],
    idempotencyKey,
  });
  ok(
    'saída com pagamento dividido é aceita (200) e valor_cobrado == valorEstimado',
    saida.status === 200 && Number(saida.dados.valor_cobrado) === valorDevido,
    saida
  );
  ok(
    'resposta da saída traz os 2 pagamentos registrados',
    Array.isArray(saida.dados.pagamentos) && saida.dados.pagamentos.length === 2,
    saida.dados?.pagamentos
  );

  const reenvio = await chamar('POST', `/movimentacoes/${movimentacaoId}/saida`, tokenOperador, {
    pagamentos: [{ forma: 'pix', valor: valorDevido }],
    idempotencyKey,
  });
  ok('reenvio com o mesmo idempotencyKey é rejeitado (409)', reenvio.status === 409, reenvio);

  const vagasDepoisSaida = await chamar('GET', '/vagas', tokenOperador);
  const vagaLivreDeNovo = vagasDepoisSaida.dados.find((v) => v.id === vagaLivre.id);
  ok('vaga volta a aparecer livre depois da saída, sem UPDATE em vagas', !vagaLivreDeNovo.movimentacao_id, vagaLivreDeNovo);

  const pagamentos = await chamar('GET', `/pagamentos/movimentacao/${movimentacaoId}`, tokenOperador);
  ok('2 pagamentos gravados pra essa movimentação', pagamentos.dados?.length === 2, pagamentos.dados);

  const logSaida = await chamar('GET', `/log-auditoria/movimentacao/${movimentacaoId}`, tokenOperador);
  const entradaLog = logSaida.dados?.find((l) => l.acao === 'registrar_saida');
  ok(
    'log de auditoria registrou a saída com usuario_id e detalhes.valorCobrado',
    entradaLog?.usuario_id === 1 && entradaLog?.detalhes?.valorCobrado === valorDevido,
    entradaLog
  );

  const turnos = await chamar('GET', '/turnos', tokenOperador);
  const turnoAberto = turnos.dados.find((t) => !t.fechamento);
  ok('existe turno aberto pra fechar', !!turnoAberto, turnoAberto);

  const pagamentosDoTurno = await chamar('GET', `/pagamentos/turno/${turnoAberto.id}`, tokenOperador);
  const somaDinheiroTurno = pagamentosDoTurno.dados
    .filter((p) => p.forma === 'dinheiro' && !p.estorno_de_id)
    .reduce((soma, p) => soma + Number(p.valor), 0);
  const valorEsperadoConferido = Math.round((Number(turnoAberto.valor_inicial) + somaDinheiroTurno) * 100) / 100;

  // Fechado por um usuário DIFERENTE de quem abriu (admin, não o operador) —
  // caso de uso citado no comentário de turnoService.fechar.
  const fechamento = await chamar('POST', `/turnos/${turnoAberto.id}/fechar`, tokenAdmin, {
    valorDeclarado: valorEsperadoConferido,
    observacoes: 'fechamento via smoke test',
  });
  ok('fechamento por outro usuário (admin) é aceito (200)', fechamento.status === 200, fechamento);
  ok(
    'valor_esperado do servidor bate com a soma de dinheiro conferida aqui',
    Number(fechamento.dados?.valor_esperado) === valorEsperadoConferido,
    fechamento.dados
  );
  ok('divergencia é 0 quando declarado == esperado', Number(fechamento.dados?.divergencia) === 0, fechamento.dados);

  const logFechamento = await chamar('GET', `/log-auditoria/turno/${turnoAberto.id}`, tokenOperador);
  const entradaLogFechamento = logFechamento.dados?.find((l) => l.acao === 'fechar_turno');
  ok(
    'log de auditoria do fechamento registra QUEM fechou (admin, id 2), não o dono do turno',
    entradaLogFechamento?.usuario_id === 2,
    entradaLogFechamento
  );

  const reFechamento = await chamar('POST', `/turnos/${turnoAberto.id}/fechar`, tokenAdmin, {
    valorDeclarado: 0,
  });
  ok('fechar turno já fechado é rejeitado (409)', reFechamento.status === 409, reFechamento);

  console.log('\n' + (falhas === 0 ? `TODOS OS ${total} CHECKS PASSARAM` : `${falhas}/${total} CHECK(S) FALHARAM`));
  process.exitCode = falhas === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('Erro inesperado no smoke test:', err);
  process.exitCode = 1;
});
