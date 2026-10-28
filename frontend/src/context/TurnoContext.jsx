import { createContext, useContext, useEffect, useState } from 'react'

// Guarda só qual é o turno ativo nesta máquina (turnoId) — é usado pela UI
// pra decidir se mostra os formulários de operação ou pede pra abrir turno
// primeiro. Identidade de quem operou vem do AuthContext (login com JWT); o
// backend deriva usuarioId/turnoId do token em toda rota, nunca confia no
// que vier daqui (ver CLAUDE.md "O servidor recalcula o valor. Sempre.").
const CHAVE_STORAGE = 'estacionamento:turnoAtivo'

const TurnoContext = createContext(null)

function lerStorage() {
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

export function TurnoProvider({ children }) {
  const [turnoAtivo, setTurnoAtivoState] = useState(lerStorage)

  useEffect(() => {
    if (turnoAtivo) {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(turnoAtivo))
    } else {
      localStorage.removeItem(CHAVE_STORAGE)
    }
  }, [turnoAtivo])

  function setTurnoAtivo(turno) {
    setTurnoAtivoState(turno)
  }

  function encerrarSessaoLocal() {
    setTurnoAtivoState(null)
  }

  return (
    <TurnoContext.Provider value={{ turnoAtivo, setTurnoAtivo, encerrarSessaoLocal }}>
      {children}
    </TurnoContext.Provider>
  )
}

export function useTurnoAtivo() {
  const ctx = useContext(TurnoContext)
  if (!ctx) throw new Error('useTurnoAtivo precisa estar dentro de <TurnoProvider>')
  return ctx
}
