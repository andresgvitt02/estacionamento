import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await login(email.trim(), senha)
      navigate('/', { replace: true })
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pagina-login">
      <section className="login-cartao">
        <h1 className="login-titulo">
          <img
            src="/logo.png"
            alt="Guarita — Gestão inteligente de estacionamento"
            className="login-logo"
          />
        </h1>
        <p className="login-chamada">Entre com sua conta para abrir o turno.</p>

        <form onSubmit={aoSubmeter} className="formulario">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />

          {erro && (
            <p role="alert" className="mensagem-erro">
              {erro}
            </p>
          )}

          <div className="formulario-acoes">
            <button type="submit" className="botao-primario botao-largo" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
