import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BloquearForm from '../components/BloquearForm'
import EntradaForm from '../components/EntradaForm'
import SaidaForm from '../components/SaidaForm'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import TipoBadge from '../components/TipoBadge'
import VagaCard from '../components/VagaCard'
import { desbloquearVaga, listarVagas } from '../api/vagas'
import { useTurnoAtivo } from '../context/TurnoContext'

// Consulta periódica pra manter "visibilidade do status do sistema"
// (heurística de Nielsen citada no CLAUDE.md) sem precisar de WebSocket
// ainda — o operador vê a ocupação mudar sem precisar apertar F5.
const INTERVALO_ATUALIZACAO_MS = 8000

export default function MapaVagas() {
  const { turnoAtivo } = useTurnoAtivo()
  const [vagas, setVagas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [vagaParaEntrada, setVagaParaEntrada] = useState(null)
  const [vagaParaSaida, setVagaParaSaida] = useState(null)
  const [vagaParaBloqueio, setVagaParaBloqueio] = useState(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await listarVagas()
      setVagas(dados)
      setErro(null)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(intervalo)
  }, [carregar])

  async function aoDesbloquear(vaga) {
    try {
      await desbloquearVaga(vaga.id)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  if (carregando) return <p>Carregando mapa de vagas...</p>

  return (
    <section>
      <div className="pagina-cabecalho">
        <h1>Mapa de vagas</h1>
        <p className="legenda" aria-hidden="true">
          <StatusBadge status="livre" /> <StatusBadge status="ocupada" /> <StatusBadge status="bloqueada" />
          <TipoBadge tipo="pcd" /> <TipoBadge tipo="idoso" /> <TipoBadge tipo="mensalista" />
        </p>
      </div>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {!turnoAtivo && (
        <p className="mensagem-aviso">
          Nenhum turno aberto neste computador — <Link to="/turno">abra um turno</Link> antes de registrar
          entradas.
        </p>
      )}

      <div className="vagas-grade">
        {vagas.map((vaga) => (
          <VagaCard
            key={vaga.id}
            vaga={vaga}
            onRegistrarEntrada={setVagaParaEntrada}
            onRegistrarSaida={setVagaParaSaida}
            onBloquear={setVagaParaBloqueio}
            onDesbloquear={aoDesbloquear}
          />
        ))}
      </div>

      {vagaParaEntrada && (
        <Modal titulo="Registrar entrada" onFechar={() => setVagaParaEntrada(null)}>
          {turnoAtivo ? (
            <EntradaForm
              vaga={vagaParaEntrada}
              onSucesso={() => {
                setVagaParaEntrada(null)
                carregar()
              }}
              onCancelar={() => setVagaParaEntrada(null)}
            />
          ) : (
            <p>
              Nenhum turno aberto neste computador. <Link to="/turno">Abra um turno</Link> primeiro.
            </p>
          )}
        </Modal>
      )}

      {vagaParaSaida && (
        <Modal titulo="Registrar saída" onFechar={() => setVagaParaSaida(null)}>
          {turnoAtivo ? (
            <SaidaForm
              vaga={vagaParaSaida}
              onSucesso={() => {
                setVagaParaSaida(null)
                carregar()
              }}
              onCancelar={() => setVagaParaSaida(null)}
            />
          ) : (
            <p>
              Nenhum turno aberto neste computador. <Link to="/turno">Abra um turno</Link> primeiro.
            </p>
          )}
        </Modal>
      )}

      {vagaParaBloqueio && (
        <Modal titulo="Bloquear vaga" onFechar={() => setVagaParaBloqueio(null)}>
          <BloquearForm
            vaga={vagaParaBloqueio}
            onSucesso={() => {
              setVagaParaBloqueio(null)
              carregar()
            }}
            onCancelar={() => setVagaParaBloqueio(null)}
          />
        </Modal>
      )}
    </section>
  )
}
