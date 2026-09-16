import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fecharTurno } from '../api/turnos'
import { useTurnoAtivo } from '../context/TurnoContext'
import { formatarReais } from '../utils/formato'

export default function FecharTurno() {
  const navigate = useNavigate()
  const { turnoAtivo, encerrarSessaoLocal } = useTurnoAtivo()

  const [valorDeclarado, setValorDeclarado] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [resultado, setResultado] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      // usuarioId não é enviado: o backend usa o do token (quem está
      // fechando, não necessariamente quem abriu — ver turnoRoutes.js).
      // valor_esperado também não vem daqui: é calculado no servidor a
      // partir dos pagamentos em dinheiro do turno (ver turnoService.fechar).
      const turnoFechado = await fecharTurno(turnoAtivo.turnoId, {
        valorDeclarado: Number(valorDeclarado),
        observacoes: observacoes.trim() || null,
      })
      setResultado(turnoFechado)
      encerrarSessaoLocal()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    const divergiu = resultado.divergencia !== 0
    return (
      <section className="pagina-estreita">
        <h1>Turno fechado</h1>

        <table className="tabela">
          <tbody>
            <tr>
              <th>Esperado na gaveta</th>
              <td>{formatarReais(resultado.valor_esperado)}</td>
            </tr>
            <tr>
              <th>Declarado pelo operador</th>
              <td>{formatarReais(resultado.valor_declarado)}</td>
            </tr>
            <tr>
              <th>Divergência</th>
              <td>{formatarReais(resultado.divergencia)}</td>
            </tr>
          </tbody>
        </table>

        {divergiu ? (
          <p className="mensagem-aviso">
            {resultado.divergencia > 0
              ? 'Sobrou dinheiro na gaveta em relação ao esperado.'
              : 'Faltou dinheiro na gaveta em relação ao esperado.'}
          </p>
        ) : (
          <p className="mensagem-sucesso">Caixa bateu certinho.</p>
        )}

        <div className="formulario-acoes">
          <button type="button" className="botao-primario" onClick={() => navigate('/')}>
            Voltar ao mapa de vagas
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="pagina-estreita">
      <h1>Fechar caixa</h1>

      <p className="formulario-subtitulo">
        Conte o dinheiro físico na gaveta e informe o total abaixo. O valor esperado é calculado pelo
        servidor — PIX e cartão não entram nessa conta, porque não passam pela gaveta.
      </p>

      <form onSubmit={aoSubmeter} className="formulario">
        <label htmlFor="valor-declarado">Valor contado na gaveta (R$) *</label>
        <input
          id="valor-declarado"
          type="number"
          min="0"
          step="0.01"
          value={valorDeclarado}
          onChange={(e) => setValorDeclarado(e.target.value)}
          required
        />

        <label htmlFor="observacoes">Observações (opcional)</label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
        />

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        <div className="formulario-acoes">
          <button type="submit" className="botao-primario" disabled={enviando}>
            {enviando ? 'Fechando...' : 'Fechar caixa'}
          </button>
        </div>
      </form>
    </section>
  )
}
