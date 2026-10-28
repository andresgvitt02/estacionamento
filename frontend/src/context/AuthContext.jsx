import { createContext, useContext, useState } from 'react'
import { login as loginApi } from '../api/auth'
import { lerSessao, limparSessao, salvarSessao } from '../auth/tokenStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao)

  async function login(email, senha) {
    const resultado = await loginApi({ email, senha })
    salvarSessao(resultado)
    setSessao(resultado)
    return resultado
  }

  function logout() {
    limparSessao()
    setSessao(null)
  }

  return (
    <AuthContext.Provider value={{ usuario: sessao?.usuario ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
