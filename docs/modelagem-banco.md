# Modelagem do banco

Schema em PostgreSQL, aplicado via [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
a partir de SQL puro (ver `backend/migrations/`). Cada migration corresponde a
uma entidade e traz, em comentário, o porquê da decisão de modelagem — a ideia
é que o schema seja lido junto com [`CLAUDE.md`](../CLAUDE.md), não à parte dele.

## Entidades e dependências

```
usuarios
veiculos
vagas
tarifas
turnos ──────────────┐
   │                  │
   ▼                  ▼
movimentacoes ◄─── (veiculos, vagas, tarifas, usuarios, turnos)
   │
   ▼
pagamentos ◄──── (movimentacoes, turnos, usuarios)

log_auditoria ◄── (usuarios)
```

`ContratoMensalista` ficou fora do escopo (ver CLAUDE.md); `vagas.tipo` já
reserva o valor `'mensalista'` para quando/se isso mudar.

## Decisões que o schema materializa

- **Vaga não tem coluna `ocupada`.** O estado é derivado: existe uma
  `Movimentacao` com `saida IS NULL` apontando pra essa vaga? Dois índices
  parciais únicos (`idx_movimentacoes_vaga_unica_aberta`,
  `idx_movimentacoes_veiculo_unica_aberta`) garantem, em nível de banco, que
  nunca existam duas movimentações abertas para a mesma vaga ou o mesmo
  veículo — sem isso a consulta "está ocupada?" ficaria ambígua.
- **`bloqueada` é diferente de `ocupada`.** Fica como coluna de verdade em
  `vagas`, porque é configuração operacional (manutenção), não decorre de
  movimentação nenhuma.
- **Tarifa tem vigência temporal.** `data_inicio` / `data_fim` em `tarifas`.
  Uma tarifa nunca é editada em cima da existente: encerra-se a vigência
  (preenche `data_fim`) e cria-se uma nova linha. `movimentacoes.tarifa_id` +
  `movimentacoes.valor_cobrado` gravam, na própria movimentação, qual tarifa
  foi aplicada e quanto foi cobrado — alterar o preço depois não muda o
  faturamento de saídas já registradas.
- **Tempo excedente é configurável pelo dono, não fixo no código.**
  `tarifas.percentual_fracao` + `tarifas.minutos_fracao` (migration
  `1700000000009`) guardam quanto (%) de `valor_hora` cada bloco de N minutos
  de permanência além da 1ª hora/tolerância custa. Defaults (100%, 60 min)
  reproduzem "hora cheia sempre ao preço integral", pra tarifa nenhuma
  quebrar; o dono ajusta pra, por exemplo, cobrar frações de 30 min a 50% do
  valor da hora. A fórmula que usa esses números ainda é aberta de propósito
  — ver a seção abaixo.
- **Arredondamento do valor final também é configurável.**
  `tarifas.arredondamento` (migration `1700000000010`, default `0.50`) é o
  múltiplo em reais pro qual o valor cobrado sobe — existe porque tem
  dinheiro físico envolvido (ver CLAUDE.md, "Pagamento em dinheiro grava
  valor_recebido e troco") e trabalhar com valor sempre redondo evita troco
  de centavos avulsos no caixa.
- **Chave é `id`, não placa.** `veiculos.placa` tem índice não-único (busca
  rápida no histórico), mas nada referencia veículo pela placa.
- **Turno é entidade própria.** `abertura`, `usuario_id` responsável,
  `fechamento`, `valor_inicial`, `valor_esperado` (calculado pelo sistema) e
  `valor_declarado` (informado pelo operador). Um índice parcial único
  impede o mesmo operador de ter dois turnos abertos ao mesmo tempo.
- **Pagamento é entidade separada da movimentação.** `pagamentos.movimentacao_id`
  não é único — uma movimentação pode ter N pagamentos (ex.: dinheiro + PIX
  na mesma saída). Pagamento em dinheiro é obrigado, por `CHECK`, a gravar
  `valor_recebido` e `troco`.
- **Estorno nunca é DELETE.** `pagamentos.estorno_de_id` aponta para o
  pagamento revertido; `motivo_estorno` e `autorizado_por_id` são obrigatórios
  quando isso acontece (também por `CHECK`). A trilha fica no próprio
  histórico da tabela.
- **`log_auditoria`** grava quem fez o quê (`usuario_id`, `acao`, `entidade`,
  `entidade_id`) e um retrato (`detalhes JSONB`) do estado relevante no
  momento — sobrevive mesmo se os dados originais mudarem depois.
- **Idempotência da confirmação de saída.** `movimentacoes.idempotency_key`
  (migration `1700000000012`) guarda o token gerado no front na abertura da
  tela de saída. Índice único parcial (`WHERE idempotency_key IS NOT NULL`,
  então movimentações antigas sem token não colidem entre si) garante, no
  banco, que reenviar o mesmo token nunca fecha duas movimentações — é uma
  segunda trava, independente do `WHERE saida IS NULL` do próprio UPDATE de
  saída (ver `backend/src/services/movimentacaoService.js`).

## Pontos deixados em aberto de propósito

- **Formato exato do cálculo de tarifa.** `tarifas.valor_hora`,
  `tolerancia_minutos`, `percentual_fracao`, `minutos_fracao` e
  `arredondamento` são os parâmetros disponíveis. Mas o que fazer com eles —
  a partir de quando conta "excedente" (fim da tolerância? fim da 1ª hora?),
  se cada bloco parcial arredonda pra cima ou é proporcional, tarifa
  diferente por tipo de veículo, etc. — é decisão da camada de serviço, não
  do schema, e é justamente o cálculo que **não deve ser desenhado pela IA**
  (ver CLAUDE.md, "Como me ajudar neste projeto"). Ajuste a tabela de novo
  se, na hora de implementar, faltar algum parâmetro.
- **Notificação automática.** `movimentacoes.notificado_em` guarda quando a
  mensagem de permanência prolongada foi enviada, pra o agendador não
  reenviar a cada ciclo (ver `backend/src/notificacao/agendador.js`).
  `movimentacoes.telefone_contato` (migration `1700000000011`) é o destino
  opcional informado na entrada — fica na movimentação (a visita), não em
  `veiculos`, porque é dado de contato de quem deixou o carro *naquela*
  visita e a retenção fica casada com ela, não presa ao veículo indefinidamente
  (ver CLAUDE.md, "LGPD": fornecimento opcional, ausência não pode impedir
  entrada/permanência/saída/pagamento — sem telefone, o agendador
  simplesmente não notifica aquela movimentação). O canal de envio
  (WhatsApp/Telegram/e-mail) não tem representação no banco — fica isolado
  atrás de `notificador.enviar()` na camada de serviço.

## Rodando as migrations

```bash
cd backend
npm install
cp .env.example .env   # ajuste DATABASE_URL
npm run migrate:up
```

`npm run migrate:down` desfaz a última migration aplicada.
`npm run migrate:create -- nome-da-migration` cria uma nova.
