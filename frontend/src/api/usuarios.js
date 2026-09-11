import client from './client'

export async function listarUsuarios() {
  const { data } = await client.get('/usuarios')
  return data
}
