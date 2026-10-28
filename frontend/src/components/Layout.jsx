import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTurnoAtivo } from '../context/TurnoContext'
import {
  IconCaixa,
  IconMapa,
  IconMenu,
  IconRelatorio,
  IconSair,
  IconTarifa,
  IconUsuarios,
  IconVaga,
} from './icons'

function iniciais(nome) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('')
}

export default function Layout() {
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { turnoAtivo, encerrarSessaoLocal } = useTurnoAtivo()
  // Só tem efeito em tela estreita, onde o menu vira uma gaveta abaixo da
  // barra superior (ver .app-sidebar no index.css).
  const [menuAberto, setMenuAberto] = useState(false)

  // Precisa derrubar as duas sessões: a de autenticação (token) e o ponteiro
  // local de turno ativo — senão o próximo operador a logar nesta máquina
  // herdaria o turnoId de quem saiu.
  function aoSair() {
    logout()
    encerrarSessaoLocal()
    navigate('/login', { replace: true })
  }

  const fecharMenu = () => setMenuAberto(false)

  return (
    <div className="app-shell">
      <aside className={`app-sidebar${menuAberto ? ' app-sidebar--aberta' : ''}`}>
        <div className="app-sidebar-topo">
          <span className="app-marca">
            <span className="app-marca-simbolo" aria-hidden="true">
              P
            </span>
            <span className="app-marca-texto">
              <strong>Guarita</strong>
              <small>Gestão de estacionamento</small>
            </span>
          </span>
          <button
            type="button"
            className="app-menu-botao"
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <IconMenu />
            <span>Menu</span>
          </button>
        </div>

        <div id="menu-principal" className="app-sidebar-corpo">
          <nav className="app-nav" aria-label="Principal">
            <span className="app-nav-grupo">Operação</span>
            <NavLink to="/" end onClick={fecharMenu}>
              <IconMapa /> Mapa de vagas
            </NavLink>
            <NavLink to="/turno" onClick={fecharMenu}>
              <IconCaixa /> {turnoAtivo ? 'Fechar caixa' : 'Abrir turno'}
            </NavLink>
            <NavLink to="/tarifas" onClick={fecharMenu}>
              <IconTarifa /> Tarifas
            </NavLink>
            <NavLink to="/relatorios" onClick={fecharMenu}>
              <IconRelatorio /> Relatórios
            </NavLink>
            {usuario.perfil === 'admin' && (
              <>
                <span className="app-nav-grupo">Administração</span>
                <NavLink to="/vagas" onClick={fecharMenu}>
                  <IconVaga /> Vagas
                </NavLink>
                <NavLink to="/usuarios" onClick={fecharMenu}>
                  <IconUsuarios /> Usuários
                </NavLink>
              </>
            )}
          </nav>

          <div className="app-sessao">
            {/* Visibilidade do status do sistema: o operador sempre sabe se
                tem turno aberto, sem precisar entrar na tela de caixa. */}
            <p className={`app-turno${turnoAtivo ? ' app-turno--aberto' : ''}`}>
              <span className="app-turno-ponto" aria-hidden="true" />
              {turnoAtivo ? 'Turno aberto' : 'Sem turno aberto'}
            </p>
            <div className="app-usuario">
              <span className="app-avatar" aria-hidden="true">
                {iniciais(usuario.nome)}
              </span>
              <span className="app-usuario-texto">
                <strong>{usuario.nome}</strong>
                <small>{usuario.perfil === 'admin' ? 'Administrador' : 'Operador'}</small>
              </span>
              <button type="button" className="app-sair" onClick={aoSair}>
                <IconSair />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  )
}
