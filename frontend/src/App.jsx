import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import MapaVagas from './pages/MapaVagas'
import Turno from './pages/Turno'
import Tarifas from './pages/Tarifas'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'
import Vagas from './pages/Vagas'
import { useAuth } from './context/AuthContext'

// Sem usuário logado (JWT), manda pra /login antes de renderizar qualquer
// tela operacional — todas as rotas de API exigem token (ver backend/app.js).
function RotaProtegida({ children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return children
}

// Cadastro de usuário/vaga é configuração do estacionamento, não ação de
// operador (mesmo critério do backend em usuarioRoutes.js/vagaRoutes.js,
// que rejeitam com 403). Redireciona em vez de mostrar a tela e deixar o
// 403 estourar nos formulários.
function RotaAdmin({ children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.perfil !== 'admin') return <Navigate to="/" replace />
  return children
}

// Evita mostrar a tela de login pra quem já está autenticado.
function RotaPublica({ children }) {
  const { usuario } = useAuth()
  if (usuario) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RotaPublica>
            <Login />
          </RotaPublica>
        }
      />
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route index element={<MapaVagas />} />
        <Route path="turno" element={<Turno />} />
        <Route path="tarifas" element={<Tarifas />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route
          path="vagas"
          element={
            <RotaAdmin>
              <Vagas />
            </RotaAdmin>
          }
        />
        <Route
          path="usuarios"
          element={
            <RotaAdmin>
              <Usuarios />
            </RotaAdmin>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
