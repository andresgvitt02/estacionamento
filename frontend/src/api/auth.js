import client from './client'

export async function login({ email, senha }) {
  const { data } = await client.post('/auth/login', { email, senha })
  return data
}
