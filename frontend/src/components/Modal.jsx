import { useEffect, useRef } from 'react'
import { IconFechar } from './icons'

const SELETOR_CAMPO = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'

export default function Modal({ titulo, onFechar, children }) {
  const conteudoRef = useRef(null)
  // A página que abre o modal se atualiza sozinha (o mapa consulta as vagas a
  // cada poucos segundos) e passa um onFechar novo a cada render. Guardar em
  // ref evita que o efeito abaixo rode de novo e roube o foco de quem está
  // digitando.
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  useEffect(() => {
    // Foco vai para o primeiro campo do formulário, só na abertura. Se não
    // houver campo (ex.: aviso de turno fechado), cai no próprio conteúdo.
    const conteudo = conteudoRef.current
    const primeiroCampo = conteudo?.querySelector(SELETOR_CAMPO)
    ;(primeiroCampo ?? conteudo)?.focus()

    function aoTeclar(evento) {
      if (evento.key === 'Escape') onFecharRef.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-cabecalho">
          <h2 id="modal-titulo">{titulo}</h2>
          <button type="button" className="botao-icone" onClick={onFechar} aria-label="Fechar">
            <IconFechar />
          </button>
        </div>
        <div ref={conteudoRef} tabIndex={-1} className="modal-conteudo">
          {children}
        </div>
      </div>
    </div>
  )
}
