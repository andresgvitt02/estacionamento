// Ícones inline (sem dependência externa). Todos são `aria-hidden` porque o
// significado real vem do texto ao lado (ver StatusBadge.jsx) — o ícone é
// reforço visual, nunca a única forma de transmitir a informação
// (CLAUDE.md, "Mapa de vagas nunca usa só cor").

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function IconLivre(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  )
}

export function IconOcupada(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16v-3l2-4a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 4v3" />
      <path d="M4 16h16v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2Z" />
      <circle cx="7.5" cy="13.5" r="0.6" fill="currentColor" />
      <circle cx="16.5" cy="13.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconBloqueada(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function IconPcd(props) {
  // Símbolo internacional de acessibilidade (cadeira de rodas), versão
  // simplificada em traço.
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M11 8v5l-3 6" />
      <path d="M11 13h5" />
      <path d="M9 20a5 5 0 1 1 6.5-6.7" />
    </svg>
  )
}

export function IconIdoso(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9 20l1.5-6L9 11l3-2 3 2-1.5 3L15 20" />
      <path d="M16 15l2 1.5-1 4.5" />
    </svg>
  )
}

export function IconMensalista(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 4v4h-4" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 20v-4h4" />
    </svg>
  )
}

export function IconFechar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// --- Navegação (Layout.jsx) — sempre acompanhados do nome da tela ---

export function IconMapa(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function IconCaixa(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 15h2" />
    </svg>
  )
}

export function IconTarifa(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

export function IconRelatorio(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </svg>
  )
}

export function IconVaga(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
    </svg>
  )
}

export function IconUsuarios(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  )
}

export function IconSair(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16l-4-4 4-4" />
      <path d="M6 12h10" />
    </svg>
  )
}

export function IconMenu(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
