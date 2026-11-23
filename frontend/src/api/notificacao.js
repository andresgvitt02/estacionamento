import client from './client'

// { conectado, qr } — qr é uma imagem (data URL) ou null. Só admin
// (ver backend/src/routes/notificacaoRoutes.js).
export async function buscarStatusNotificacao() {
  const { data } = await client.get('/notificacao/status')
  return data
}
