import axios from 'axios'
import { lerSessao } from '../auth/tokenStorage'

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
    const mensagem = error.response?.data?.erro ?? error.message ?? 'Erro inesperado'
    return Promise.reject(new Error(mensagem))
  }
)

export default client
