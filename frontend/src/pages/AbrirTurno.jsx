import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { abrirTurno } from '../api/turnos'
import { useAuth } from '../context/AuthContext'
import { useTurnoAtivo } from '../context/TurnoContext'

// Só é renderizada quando não há turno ativo (ver Turno.jsx) — se já existe
// um, quem entra em /turno vê FecharTurno, não esta tela.
export default function AbrirTurno() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { setTurnoAtivo } = useTurnoAtivo()

  const [valorInicial, setValorInicial] = useState('0')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      // usuarioId não é enviado: o backend usa o do token (ver
      // turnoRoutes.js) — não tem como abrir turno em nome de outro operador
      // só mudando o body.
      const turno = await abrirTurno({ valorInicial: Number(valorInicial) })
      setTurnoAtivo({ turnoId: turno.id })
      navigate('/')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="pagina-estreita">
      <h1>Abrir turno</h1>

      <p className="formulario-subtitulo">
        Operador: <strong>{usuario.nome}</strong>
      </p>

      <form onSubmit={aoSubmeter} className="formulario">
        <label htmlFor="valor-inicial">Valor inicial em caixa (R$)</label>
        <input
          id="valor-inicial"
          type="number"
          min="0"
          step="0.01"
          value={valorInicial}
          onChange={(e) => setValorInicial(e.target.value)}
          required
        />

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        <div className="formulario-acoes">
          <button type="submit" className="botao-primario" disabled={enviando}>
            {enviando ? 'Abrindo...' : 'Abrir turno'}
          </button>
        </div>
      </form>
    </section>
  )
}
