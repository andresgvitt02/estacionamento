import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import MapaVagas from './pages/MapaVagas'
import Turno from './pages/Turno'
import Tarifas from './pages/Tarifas'
import Relatorios from './pages/Relatorios'
import { useAuth } from './context/AuthContext'

// Sem usuário logado (JWT), manda pra /login antes de renderizar qualquer
// tela operacional — todas as rotas de API exigem token (ver backend/app.js).
function RotaProtegida({ children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
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
      </Route>
    </Routes>
  )
}

export default App
