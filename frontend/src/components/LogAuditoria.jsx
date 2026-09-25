import { useEffect, useState } from 'react'
import { buscarLogPorEntidade } from '../api/logAuditoria'
import { formatarData, formatarReais } from '../utils/formato'

// Rótulo legível pra cada acao gravada pelas services (ver
// logAuditoriaRepository.registrar, chamado só de dentro de
// movimentacaoService/turnoService/pagamentoService — nunca direto da
// rota). Uma acao não mapeada ainda mostra o valor cru em vez de sumir,
// pra este componente não precisar de manutenção toda vez que uma service
// nova passar a registrar log.
const NOMES_ACAO = {
  registrar_saida: 'Saída registrada',
  fechar_turno: 'Turno fechado',
  estornar_pagamento: 'Pagamento estornado',
}

// "detalhes" é o retrato (JSON) que a service decidiu gravar no momento da
// ação — o formato varia por acao de propósito (ver comentário em
// logAuditoriaRepository.js). Em vez deste componente conhecer o formato de
// cada acao, ele só lista as chaves: isso é o que garante que o log
// continua legível mesmo pra uma acao/detalhes que ainda não existe hoje.
function formatarDetalhes(detalhes) {
  if (!detalhes || typeof detalhes !== 'object') return null
  return Object.entries(detalhes).map(([chave, valor]) => {
    const ehValorMonetario = /valor|esperado|declarado|divergencia/i.test(chave)
    const exibido =
      ehValorMonetario && typeof valor === 'number' ? formatarReais(valor) : JSON.stringify(valor)
    return { chave, exibido }
  })
}

export default function LogAuditoria({ entidade, entidadeId }) {
  const [registros, setRegistros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let ativo = true
    buscarLogPorEntidade(entidade, entidadeId)
      .then((dados) => ativo && setRegistros(dados))
      .catch((err) => ativo && setErro(err.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [entidade, entidadeId])

  if (carregando) return <p>Carregando log...</p>
  if (erro)
    return (
      <p role="alert" className="mensagem-erro">
        {erro}
      </p>
    )
  if (registros.length === 0) return <p>Nenhum registro de auditoria pra isto ainda.</p>

  return (
    <ul className="log-auditoria-lista">
      {registros.map((registro) => (
        <li key={registro.id} className="log-auditoria-item">
          <p>
            <strong>{NOMES_ACAO[registro.acao] ?? registro.acao}</strong> por{' '}
            <strong>{registro.usuario_nome ?? 'sistema'}</strong> em {formatarData(registro.criado_em)}
          </p>
          {formatarDetalhes(registro.detalhes) && (
            <p className="formulario-ajuda">
              {formatarDetalhes(registro.detalhes)
                .map(({ chave, exibido }) => `${chave}: ${exibido}`)
                .join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
