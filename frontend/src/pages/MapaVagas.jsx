import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BloquearForm from '../components/BloquearForm'
import EntradaForm from '../components/EntradaForm'
import SaidaForm from '../components/SaidaForm'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import TipoBadge from '../components/TipoBadge'
import VagaCard from '../components/VagaCard'
import { IconBloqueada, IconLivre, IconOcupada } from '../components/icons'
import { desbloquearVaga, listarVagas } from '../api/vagas'
import { useTurnoAtivo } from '../context/TurnoContext'
import { derivarStatus } from '../utils/statusVaga'

// Consulta periódica pra manter "visibilidade do status do sistema"
// (heurística de Nielsen citada no CLAUDE.md) sem precisar de WebSocket
// ainda — o operador vê a ocupação mudar sem precisar apertar F5.
const INTERVALO_ATUALIZACAO_MS = 8000

export default function MapaVagas() {
  const { turnoAtivo } = useTurnoAtivo()
  const [vagas, setVagas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [atualizadoEm, setAtualizadoEm] = useState(null)
  const [vagaParaEntrada, setVagaParaEntrada] = useState(null)
  const [vagaParaSaida, setVagaParaSaida] = useState(null)
  const [vagaParaBloqueio, setVagaParaBloqueio] = useState(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await listarVagas()
      setVagas(dados)
      setAtualizadoEm(new Date())
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

  const contagem = { livre: 0, ocupada: 0, bloqueada: 0 }
  for (const vaga of vagas) contagem[derivarStatus(vaga)] += 1
  // Bloqueada não entra no denominador: vaga em manutenção não está
  // disponível pra ocupar, então contaria como "folga" que não existe.
  const utilizaveis = contagem.livre + contagem.ocupada
  const percentualOcupacao = utilizaveis ? Math.round((contagem.ocupada / utilizaveis) * 100) : 0

  return (
    <section>
      <div className="pagina-cabecalho">
        <div>
          <h1>Mapa de vagas</h1>
          {atualizadoEm && (
            <p className="pagina-subtitulo">
              Atualiza sozinho · última consulta às{' '}
              {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Cada indicador tem ícone + rótulo + número — a cor só reforça. */}
      <ul className="resumo-ocupacao" aria-label="Resumo de ocupação">
        <li className="resumo-card resumo-card--livre">
          <IconLivre />
          <span className="resumo-rotulo">Livres</span>
          <strong className="resumo-valor">{contagem.livre}</strong>
        </li>
        <li className="resumo-card resumo-card--ocupada">
          <IconOcupada />
          <span className="resumo-rotulo">Ocupadas</span>
          <strong className="resumo-valor">{contagem.ocupada}</strong>
        </li>
        <li className="resumo-card resumo-card--bloqueada">
          <IconBloqueada />
          <span className="resumo-rotulo">Bloqueadas</span>
          <strong className="resumo-valor">{contagem.bloqueada}</strong>
        </li>
        <li className="resumo-card resumo-card--taxa">
          <span className="resumo-rotulo">Ocupação</span>
          <strong className="resumo-valor">{percentualOcupacao}%</strong>
          <span
            className="resumo-barra"
            role="meter"
            aria-label="Taxa de ocupação"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentualOcupacao}
          >
            <span style={{ width: `${percentualOcupacao}%` }} />
          </span>
        </li>
      </ul>

      <p className="legenda" aria-hidden="true">
        <span className="legenda-titulo">Legenda</span>
        <StatusBadge status="livre" /> <StatusBadge status="ocupada" /> <StatusBadge status="bloqueada" />
        <TipoBadge tipo="pcd" /> <TipoBadge tipo="idoso" /> <TipoBadge tipo="mensalista" />
      </p>

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
