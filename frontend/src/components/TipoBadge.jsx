import { IconIdoso, IconMensalista, IconPcd } from './icons'

// Vaga PCD e idoso são obrigatórias por lei e têm marcação própria
// (CLAUDE.md, "Interface"). 'comum' não ganha selo — é o padrão implícito.
const CONFIG = {
  pcd: { Icon: IconPcd, texto: 'PCD', classe: 'tipo-pcd' },
  idoso: { Icon: IconIdoso, texto: 'Idoso', classe: 'tipo-idoso' },
  mensalista: { Icon: IconMensalista, texto: 'Mensalista', classe: 'tipo-mensalista' },
}

export default function TipoBadge({ tipo }) {
  const config = CONFIG[tipo]
  if (!config) return null
  const { Icon, texto, classe } = config

  return (
    <span className={`tipo-badge ${classe}`}>
      <Icon width={14} height={14} />
      <span>{texto}</span>
    </span>
  )
}
