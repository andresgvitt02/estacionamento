import { useState } from 'react'
import { bloquearVaga } from '../api/vagas'

export default function BloquearForm({ vaga, onSucesso, onCancelar }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const atualizada = await bloquearVaga(vaga.id, motivo.trim())
      onSucesso(atualizada)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="formulario">
      <p className="formulario-subtitulo">
        Vaga <strong>{vaga.codigo}</strong>
      </p>

      <label htmlFor="motivo">Motivo do bloqueio *</label>
      <input
        id="motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        required
        placeholder="Ex.: manutenção, piso danificado"
      />

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      <div className="formulario-acoes">
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="botao-primario" disabled={enviando}>
          {enviando ? 'Bloqueando...' : 'Bloquear vaga'}
        </button>
      </div>
    </form>
  )
}
