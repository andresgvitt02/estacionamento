import { useEffect, useRef } from 'react'
import { IconFechar } from './icons'

export default function Modal({ titulo, onFechar, children }) {
  const primeiroCampoRef = useRef(null)

  useEffect(() => {
    primeiroCampoRef.current?.focus()

    function aoTeclar(evento) {
      if (evento.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-cabecalho">
          <h2 id="modal-titulo">{titulo}</h2>
          <button type="button" className="botao-icone" onClick={onFechar} aria-label="Fechar">
            <IconFechar />
          </button>
        </div>
        <div ref={primeiroCampoRef} tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  )
}
