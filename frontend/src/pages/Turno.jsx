import { useTurnoAtivo } from '../context/TurnoContext'
import AbrirTurno from './AbrirTurno'
import FecharTurno from './FecharTurno'

// Uma única entrada de menu ("Turno") que mostra a tela certa conforme já
// existe ou não um turno ativo neste computador — evita duas rotas separadas
// pra abrir/fechar quando só uma faz sentido de cada vez.
export default function Turno() {
  const { turnoAtivo } = useTurnoAtivo()
  return turnoAtivo ? <FecharTurno /> : <AbrirTurno />
}
