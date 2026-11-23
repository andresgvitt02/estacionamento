import { useEffect, useState } from 'react'
import { buscarStatusNotificacao } from '../api/notificacao'

// O QR muda a cada ~20 s e a conexão pode cair a qualquer momento, então a
// tela pergunta de novo ao backend a cada poucos segundos em vez de
// carregar uma vez só.
const INTERVALO_MS = 3000

export default function WhatsApp() {
  const [status, setStatus] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function atualizar() {
      try {
        const dados = await buscarStatusNotificacao()
        if (!cancelado) {
          setStatus(dados)
          setErro(null)
        }
      } catch (err) {
        if (!cancelado) setErro(err.message)
      }
    }

    atualizar()
    const timer = setInterval(atualizar, INTERVALO_MS)
    return () => {
      cancelado = true
      clearInterval(timer)
    }
  }, [])

  return (
    <section>
      <h1>WhatsApp</h1>
      <p className="formulario-subtitulo">
        Conexão usada para avisar o cliente quando o veículo passa do tempo de permanência.
      </p>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {!status && !erro && <p>Verificando conexão...</p>}

      {status?.conectado && <p className="mensagem-sucesso">Conectado. As notificações estão saindo normalmente.</p>}

      {status && !status.conectado && status.qr && (
        <>
          <p className="mensagem-aviso">
            Desconectado. No celular do chip, abra o WhatsApp, vá em Aparelhos conectados, toque em
            Conectar um aparelho e escaneie o código abaixo.
          </p>
          <img src={status.qr} alt="QR Code para conectar o WhatsApp" width={300} height={300} />
        </>
      )}

      {status && !status.conectado && !status.qr && <p>Conectando...</p>}
    </section>
  )
}
