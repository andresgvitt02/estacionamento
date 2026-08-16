# Sistema de Gerenciamento de Estacionamento

TCC / Projeto Tecnológico — Análise e Desenvolvimento de Sistemas, ULBRA Torres.
Autor: Andres Gonçalves Vitt. Orientador: Daniel Souza Vargas.

Sistema web para estacionamentos de pequeno e médio porte que operam hoje com
papel ou planilha. Resolve três dores: não saber se há vaga sem ir olhar, calcular
o valor de cabeça na saída, e não conseguir conferir o caixa no fim do expediente.

## Stack

- **Frontend:** React
- **Backend:** Node.js + Express
- **Banco:** PostgreSQL
- **Comunicação:** API REST

## Arquitetura

Monolito em camadas. Microsserviços foram descartados: escopo reduzido, domínio
bem definido, baixo volume de acessos simultâneos.

No backend, três camadas com dependências apontando para dentro:

```
rota (HTTP)  →  serviço (regra de negócio)  →  repositório (acesso a dados)
```

A camada de serviço não conhece Express nem o driver do banco. Isso é o que
permite testar o cálculo de tarifa sem subir servidor — e esse teste unitário é
um dos argumentos centrais do trabalho.

## Decisões de modelagem (não alterar sem motivo)

**Tarifa tem vigência temporal.** Colunas `data_inicio` / `data_fim`. O valor
efetivamente cobrado é gravado na própria movimentação, junto com a referência à
tarifa aplicada. Alterar preço não pode mudar o faturamento de períodos passados.

**Vaga não tem coluna `ocupada`.** O estado é derivado: existe movimentação com
`saida IS NULL` apontando para ela? Então está ocupada. Coluna booleana atualizada
à mão gera vaga fantasma quando algo falha no meio.

**Turno é entidade própria.** Abertura, operador responsável, fechamento, valor
esperado e valor declarado. Sem isso o fechamento de caixa não fecha.

**Pagamento é entidade separada da movimentação.** Uma movimentação pode ter N
pagamentos (dinheiro + PIX na mesma saída). A soma tem que bater com o devido.

**Estorno nunca faz DELETE.** Cria lançamento contrário, com motivo e quem
autorizou. Sistema que mexe com dinheiro precisa de trilha de auditoria.

**Chave é `id`, não placa.** Placa muda de dono e o padrão Mercosul já quebrou
sistema antigo por aí.

Entidades: `Usuario`, `Veiculo`, `Vaga`, `Tarifa`, `Movimentacao`, `Pagamento`,
`Turno`, `LogAuditoria`. (`ContratoMensalista` ficou fora do escopo.)

## Regras críticas

**Saída é transação atômica.** Calcular → registrar pagamento → liberar vaga.
Tudo ou nada. Sem isso: ou cobra sem liberar (vaga fantasma), ou libera sem
cobrar (dinheiro sumido do caixa).

**O servidor recalcula o valor. Sempre.** O front manda o id da movimentação e a
forma de pagamento — nunca o valor. Confiar no valor vindo do cliente é
alterável pelo DevTools.

**Idempotência na confirmação.** Token gerado na abertura da tela; segundo envio
com o mesmo token é rejeitado. Duplo clique não pode gerar dois pagamentos.

**Pagamento em dinheiro grava `valor_recebido` e `troco`.** Sem isso o operador
não sabe quanto deveria ter na gaveta.

**Log de auditoria:** quem registrou qual saída, com que valor, quando.

## Interface

**Mapa de vagas nunca usa só cor.** Cor + ícone + texto, sempre. Verde/vermelho é
o par que pessoas com deuteranopia não distinguem — critério WCAG 1.4.1.

Estados da vaga: livre, ocupada (mostra a placa), mensalista/fixa, bloqueada
(manutenção). Vagas PCD e idoso são obrigatórias por lei e têm marcação própria.

Heurísticas de Nielsen que guiam a tela: visibilidade do status do sistema (o
operador vê a ocupação em tempo real) e reconhecimento em vez de memorização (as
informações ficam na tela, não na cabeça).

## Notificação automática

Agendador (`node-cron`) consulta periodicamente as movimentações abertas,
identifica as que passaram do limite configurado e dispara a mensagem.

- Grava que a notificação foi enviada, para não reenviar a cada ciclo
- Intervalo é configuração, não constante no código
- **O canal de envio fica isolado atrás de uma interface** — `notificador.enviar(destino, mensagem)`. O serviço não sabe se é WhatsApp, Telegram ou e-mail. Trocar de canal é trocar a implementação.

Cliente de WhatsApp não oficial (viola os termos da Meta; número dedicado,
descartável). **Testar isso cedo** — é o único item que depende de algo fora do
meu controle. Se falhar, troco para Telegram.

## LGPD

Placa é dado pessoal (pessoa identificável). Histórico de entrada/saída revela
padrão de deslocamento. Telefone é dado de contato, **fornecimento opcional** — a
ausência dele não pode impedir entrada, permanência, saída ou pagamento.

Coleta com finalidade determinada, retenção só pelo tempo necessário.

## Fora do escopo

Cancelas automáticas, OCR de placas, gateway de pagamento real, documento fiscal,
chatbot de atendimento. Pagamento é **simulado**: grava valor, forma e horário —
nunca número de cartão, CPF ou dados do titular.

## Ordem de implementação

1. Testar integração WhatsApp (risco externo — resolver primeiro)
2. Modelagem do banco
3. Camada de serviço: cálculo de tarifa **com testes unitários**
4. API REST
5. Interface React
6. Módulo financeiro (fechamento de caixa, relatórios)
7. Notificação automática

## Como me ajudar neste projeto

Escreva boilerplate, configuração, formulários, CRUD simples.

**Não escreva por mim:** cálculo de tarifa, transação de saída, fechamento de
caixa. São as três coisas sobre as quais vou ser arguido na banca — preciso
conseguir explicar cada linha.

Quando sugerir algo que contrarie uma decisão acima, diga que contraria e por quê,
em vez de simplesmente seguir.