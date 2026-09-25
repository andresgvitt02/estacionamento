import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTurnoAtivo } from '../context/TurnoContext'

export default function Layout() {
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { turnoAtivo, encerrarSessaoLocal } = useTurnoAtivo()

  // Precisa derrubar as duas sessões: a de autenticação (token) e o ponteiro
  // local de turno ativo — senão o próximo operador a logar nesta máquina
  // herdaria o turnoId de quem saiu.
  function aoSair() {
    logout()
    encerrarSessaoLocal()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-titulo">Estacionamento</span>
        <nav className="app-nav" aria-label="Principal">
          <NavLink to="/" end>
            Mapa de vagas
          </NavLink>
          <NavLink to="/turno">{turnoAtivo ? 'Fechar caixa' : 'Abrir turno'}</NavLink>
          <NavLink to="/tarifas">Tarifas</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
          {usuario.perfil === 'admin' && (
            <>
              <NavLink to="/vagas">Vagas</NavLink>
              <NavLink to="/usuarios">Usuários</NavLink>
            </>
          )}
        </nav>
        <div className="app-sessao">
          <span>
            Operador: <strong>{usuario.nome}</strong>
          </span>
          <button type="button" className="botao-link" onClick={aoSair}>
            Sair
          </button>
        </div>
      </header>

      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  )
}
