import StatusBadge from './StatusBadge'
import TipoBadge from './TipoBadge'
import { derivarStatus } from '../utils/statusVaga'

export default function VagaCard({ vaga, onRegistrarEntrada, onRegistrarSaida, onBloquear, onDesbloquear }) {
  const status = derivarStatus(vaga)

  return (
    <article className={`vaga-card vaga-card--${status}`} aria-label={`Vaga ${vaga.codigo}, ${status}`}>
      <header className="vaga-card-topo">
        <span className="vaga-codigo">{vaga.codigo}</span>
        <StatusBadge status={status} />
      </header>

      {status === 'ocupada' && vaga.placa && <p className="vaga-placa">{vaga.placa}</p>}
      {status === 'bloqueada' && vaga.motivo_bloqueio && (
        <p className="vaga-motivo">{vaga.motivo_bloqueio}</p>
      )}

      {vaga.tipo !== 'comum' && (
        <div className="vaga-card-tipos">
          <TipoBadge tipo={vaga.tipo} />
        </div>
      )}

      <div className="vaga-card-acoes">
        {status === 'livre' && (
          <>
            <button type="button" className="botao-primario botao-pequeno" onClick={() => onRegistrarEntrada(vaga)}>
              Registrar entrada
            </button>
            <button type="button" className="botao-secundario botao-pequeno" onClick={() => onBloquear(vaga)}>
              Bloquear
            </button>
          </>
        )}
        {status === 'ocupada' && (
          <button type="button" className="botao-primario botao-pequeno" onClick={() => onRegistrarSaida(vaga)}>
            Registrar saída
          </button>
        )}
        {status === 'bloqueada' && (
          <button type="button" className="botao-secundario botao-pequeno" onClick={() => onDesbloquear(vaga)}>
            Desbloquear
          </button>
        )}
      </div>
    </article>
  )
}
