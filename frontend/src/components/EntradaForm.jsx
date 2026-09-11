import { useState } from 'react'
import { registrarEntrada } from '../api/movimentacoes'

export default function EntradaForm({ vaga, onSucesso, onCancelar }) {
  const [placa, setPlaca] = useState('')
  const [tipo, setTipo] = useState('carro')
  const [modelo, setModelo] = useState('')
  const [cor, setCor] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      // usuarioId/turnoId não são enviados: o backend deriva do token e do
      // turno aberto do próprio operador (ver movimentacaoRoutes.js).
      const movimentacao = await registrarEntrada({
        veiculo: { placa: placa.trim().toUpperCase(), tipo, modelo: modelo.trim() || null, cor: cor.trim() || null },
        vagaId: vaga.id,
        telefoneContato: telefone.trim() || null,
      })
      onSucesso(movimentacao)
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

      <label htmlFor="placa">Placa *</label>
      <input
        id="placa"
        value={placa}
        onChange={(e) => setPlaca(e.target.value)}
        required
        maxLength={8}
        autoComplete="off"
        placeholder="ABC1D23"
      />

      <label htmlFor="tipo-veiculo">Tipo de veículo</label>
      <select id="tipo-veiculo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="carro">Carro</option>
        <option value="moto">Moto</option>
        <option value="outro">Outro</option>
      </select>

      <label htmlFor="modelo">Modelo (opcional)</label>
      <input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />

      <label htmlFor="cor">Cor (opcional)</label>
      <input id="cor" value={cor} onChange={(e) => setCor(e.target.value)} />

      <label htmlFor="telefone">Telefone de contato (opcional)</label>
      <input
        id="telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        autoComplete="off"
        placeholder="51999998888"
      />
      <p className="formulario-ajuda">
        Usado só para avisar se o veículo passar do tempo de permanência configurado. Fornecer é
        opcional e não impede a entrada.
      </p>

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
          {enviando ? 'Registrando...' : 'Registrar entrada'}
        </button>
      </div>
    </form>
  )
}
