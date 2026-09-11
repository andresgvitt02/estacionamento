import { IconBloqueada, IconLivre, IconOcupada } from './icons'

// Cor + ícone + texto, sempre juntos (CLAUDE.md, "Mapa de vagas nunca usa só
// cor" — critério WCAG 1.4.1). Deliberadamente NÃO uso o par verde/vermelho
// pra livre/ocupada: é o par que pessoas com deuteranopia confundem. Livre
// fica verde, ocupada fica azul — cores que não colidem nessa condição — e o
// ícone + texto garantem a leitura mesmo pra quem não distingue cor nenhuma.
const CONFIG = {
  livre: { Icon: IconLivre, texto: 'Livre', classe: 'status-livre' },
  ocupada: { Icon: IconOcupada, texto: 'Ocupada', classe: 'status-ocupada' },
  bloqueada: { Icon: IconBloqueada, texto: 'Bloqueada', classe: 'status-bloqueada' },
}

export default function StatusBadge({ status }) {
  const config = CONFIG[status]
  if (!config) return null
  const { Icon, texto, classe } = config

  return (
    <span className={`status-badge ${classe}`}>
      <Icon />
      <span>{texto}</span>
    </span>
  )
}
