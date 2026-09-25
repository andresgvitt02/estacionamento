import { useEffect, useState } from 'react'
import { atualizarVaga, criarVaga, listarVagas } from '../api/vagas'
import Modal from '../components/Modal'
import TipoBadge from '../components/TipoBadge'

const CAMPOS_INICIAIS = { codigo: '', tipo: 'comum' }

const OPCOES_TIPO = [
  { valor: 'comum', texto: 'Comum' },
  { valor: 'pcd', texto: 'PCD' },
  { valor: 'idoso', texto: 'Idoso' },
  { valor: 'mensalista', texto: 'Mensalista' },
]

export default function Vagas() {
  const [vagas, setVagas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [campos, setCampos] = useState(CAMPOS_INICIAIS)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [vagaParaEditar, setVagaParaEditar] = useState(null)

  async function recarregar() {
    setVagas(await listarVagas())
  }

  useEffect(() => {
    recarregar()
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false))
  }, [])

  function aoMudarCampo(campo) {
    return (evento) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }))
  }

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    setEnviando(true)
    try {
      await criarVaga({ codigo: campos.codigo.trim().toUpperCase(), tipo: campos.tipo })
      setSucesso('Vaga cadastrada.')
      setCampos(CAMPOS_INICIAIS)
      await recarregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p>Carregando vagas...</p>

  return (
    <section>
      <h1>Vagas</h1>
      <p className="formulario-subtitulo">
        Bloqueio/desbloqueio por manutenção é feito no mapa de vagas — aqui é só cadastro (código e tipo).
      </p>

      <div className="pagina-colunas">
        <form onSubmit={aoSubmeter} className="formulario">
          <p className="formulario-subtitulo">Cadastrar nova vaga.</p>

          <label htmlFor="codigo">Código *</label>
          <input
            id="codigo"
            value={campos.codigo}
            onChange={aoMudarCampo('codigo')}
            required
            maxLength={10}
            placeholder="Ex: A12"
          />

          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={campos.tipo} onChange={aoMudarCampo('tipo')}>
            {OPCOES_TIPO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.texto}
              </option>
            ))}
          </select>

          {erro && (
            <p role="alert" className="mensagem-erro">
              {erro}
            </p>
          )}
          {sucesso && <p className="mensagem-sucesso">{sucesso}</p>}

          <div className="formulario-acoes">
            <button type="submit" className="botao-primario" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Cadastrar vaga'}
            </button>
          </div>
        </form>

        <div>
          <p className="formulario-subtitulo">Cadastradas</p>
          <div className="tabela-scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Bloqueada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vagas.map((vaga) => (
                  <tr key={vaga.id}>
                    <td>{vaga.codigo}</td>
                    <td>
                      <TipoBadge tipo={vaga.tipo} />
                      {vaga.tipo === 'comum' && 'Comum'}
                    </td>
                    <td>{vaga.bloqueada ? `Sim — ${vaga.motivo_bloqueio ?? ''}` : 'Não'}</td>
                    <td>
                      <button type="button" className="botao-link" onClick={() => setVagaParaEditar(vaga)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {vagaParaEditar && (
        <Modal titulo="Editar vaga" onFechar={() => setVagaParaEditar(null)}>
          <EditarVagaForm
            vaga={vagaParaEditar}
            onSucesso={() => {
              setVagaParaEditar(null)
              recarregar()
            }}
            onCancelar={() => setVagaParaEditar(null)}
          />
        </Modal>
      )}
    </section>
  )
}

function EditarVagaForm({ vaga, onSucesso, onCancelar }) {
  const [codigo, setCodigo] = useState(vaga.codigo)
  const [tipo, setTipo] = useState(vaga.tipo)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await atualizarVaga(vaga.id, { codigo: codigo.trim().toUpperCase(), tipo })
      onSucesso()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="formulario">
      <label htmlFor="edit-codigo">Código *</label>
      <input id="edit-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={10} />

      <label htmlFor="edit-tipo">Tipo</label>
      <select id="edit-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {OPCOES_TIPO.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>

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
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
