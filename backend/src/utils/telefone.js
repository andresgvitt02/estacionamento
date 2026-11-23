// Padroniza o telefone de contato para o formato que o canal de notificação
// espera: só dígitos, com o código do país (55) na frente.
//
// O campo da tela de entrada não tem máscara, e o operador costuma digitar
// só DDD + número ("51 99999-8888"). Sem o 55, o WhatsApp não encontra o
// número e a notificação nunca sai — foi o que aconteceu no teste com o
// celular em 10/11/2026 (telefone gravado como "51999998888").
//
// Aceita:
//   10 ou 11 dígitos (DDD + fixo/celular)       -> recebe o 55 na frente
//   12 ou 13 dígitos começando com 55            -> já está completo
// Qualquer outra coisa devolve null (formato não reconhecido).
function normalizarTelefone(entrada) {
  if (entrada == null) return null;
  const digitos = String(entrada).replace(/\D/g, '');

  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos;
  return null;
}

module.exports = { normalizarTelefone };
