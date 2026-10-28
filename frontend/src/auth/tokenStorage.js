// Módulo isolado (sem React) pra guardar a sessão (token + usuário) no
// localStorage. Separado do AuthContext.jsx de propósito: o client.js do
// axios precisa ler o token pra montar o header Authorization, mas é um
// módulo puro, fora da árvore de componentes — importar AuthContext.jsx
// dali criaria um ciclo (client -> AuthContext -> api/auth -> client).
const CHAVE_STORAGE = 'estacionamento:auth'

export function lerSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

export function salvarSessao(sessao) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(sessao))
}

export function limparSessao() {
  localStorage.removeItem(CHAVE_STORAGE)
}
