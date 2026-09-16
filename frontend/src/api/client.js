import axios from 'axios'
import { lerSessao, limparSessao } from '../auth/tokenStorage'

// Instância única do axios. baseURL relativa porque o vite.config.js já
// faz o proxy de /api para o backend em dev, e em produção os dois ficam
// atrás do mesmo domínio.
const client = axios.create({
  baseURL: '/api',
})

// Toda rota sob /api (exceto /auth/login) exige Bearer token (ver
// backend/src/app.js) — anexa aqui pra nenhuma chamada precisar fazer isso
// na mão.
client.interceptors.request.use((config) => {
  const token = lerSessao()?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// O backend sempre devolve erro no formato { erro: "mensagem" } (ver
// errorHandler.js). Normaliza aqui pra toda tela poder fazer só
// `catch (err) { mostrar(err.message) }` sem reimplementar isso.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sessão ausente/expirada (ver backend/src/middlewares/autenticar.js,
    // que devolve 401 pros dois casos — token de 12h passa disso num turno
    // inteiro). Sem isso o AuthContext continuava achando que tinha usuário
    // logado e a tela protegida ficava renderizada mostrando só a mensagem
    // de erro, sem indicar que era preciso relogar.
    //
    // Faz reload inteiro (não useNavigate) de propósito: client.js é módulo
    // puro fora da árvore de componentes (ver auth/tokenStorage.js) — não dá
    // pra chamar AuthContext.logout() daqui sem criar ciclo de import. O
    // reload remonta o AuthProvider, que relê a sessão (agora limpa) do
    // localStorage.
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      limparSessao()
      window.location.href = '/login'
    }

    const mensagem = error.response?.data?.erro ?? error.message ?? 'Erro inesperado'
    return Promise.reject(new Error(mensagem))
  }
)

export default client
