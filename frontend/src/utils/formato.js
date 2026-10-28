// Formatação de dinheiro/data compartilhada entre telas. Antes desta
// extração, formatarReais/formatarData/arredondar estavam copiados
// verbatim em SaidaForm.jsx, FecharTurno.jsx, Relatorios.jsx e Tarifas.jsx
// (encontrado em revisão de código) — qualquer ajuste (ex.: casas decimais,
// locale) precisava ser replicado em até 4 lugares, arriscando telas
// mostrarem o mesmo valor formatado de jeitos diferentes.

export function formatarReais(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR')
}

// Só ajuste de exibição (corrige erro de ponto flutuante antes de mostrar
// pro operador, ex.: "7.5000000000000009") — não é a regra de arredondamento
// de tarifa em si, que continua só em tarifaService.calcularValor no
// backend (ver CLAUDE.md: o servidor recalcula o valor, sempre).
export function arredondarCentavos(valor) {
  return Math.round(valor * 100) / 100
}
