import { useCallback, useEffect, useState } from 'react'
import { estornarPagamento, listarPagamentosPorMovimentacao } from '../api/pagamentos'
import { formatarData, formatarReais } from '../utils/formato'

const NOMES_FORMA = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão' }

// Lista os pagamentos de uma movimentação e permite estornar (POST
// /pagamentos/:id/estornar, restrito a admin no backend — ver
// pagamentoRoutes.js). O front não decide nada da regra: só manda o motivo
// e mostra o que o backend devolve. Um pagamento que já é estorno, ou que já
// foi estornado, não ganha o botão — o backend rejeitaria (409) de qualquer
// forma, isso é só pra não convidar o clique.
export default function PagamentosMovimentacao({ movimentacaoId }) {
  const [pagamentos, setPagamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [pagamentoParaEstornar, setPagamentoParaEstornar] = useState(null)

  const recarregar = useCallback(async () => {
    setPagamentos(await listarPagamentosPorMovimentacao(movimentacaoId))
  }, [movimentacaoId])

  useEffect(() => {
    recarregar()
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false))
  }, [recarregar])

  if (carregando) return <p>Carregando pagamentos...</p>

  const idsJaEstornados = new Set(pagamentos.filter((p) => p.estorno_de_id).map((p) => p.estorno_de_id))

  return (
    <div>
      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      <table className="tabela">
        <thead>
          <tr>
            <th>Forma</th>
            <th>Valor</th>
            <th>Quando</th>
            <th>Motivo / autorizado por</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pagamentos.map((pagamento) => {
            const ehEstorno = Boolean(pagamento.estorno_de_id)
            const jaEstornado = idsJaEstornados.has(pagamento.id)
            return (
              <tr key={pagamento.id}>
                <td>{NOMES_FORMA[pagamento.forma] ?? pagamento.forma}</td>
                <td className={ehEstorno ? 'valor-divergente' : undefined}>
                  {ehEstorno ? '− ' : ''}
                  {formatarReais(pagamento.valor)}
                </td>
                <td>{formatarData(pagamento.criado_em)}</td>
                <td>
                  {/* Motivo e autor só existem em linha de estorno (CHECK no
                      schema exige os dois juntos — ver migration 7); um
                      pagamento normal nunca tem os dois preenchidos. */}
                  {/* autorizado_por_nome não deveria vir nulo pra uma linha de
                      estorno (usuário nunca é apagado, só desativado — ver
                      usuarioRepository.js) — o "desconhecido" aqui é só
                      defensivo, não um caso esperado. */}
                  {ehEstorno ? `${pagamento.motivo_estorno} — ${pagamento.autorizado_por_nome ?? 'desconhecido'}` : '—'}
                </td>
                <td>
                  {!ehEstorno && !jaEstornado && (
                    <button
                      type="button"
                      className="botao-link"
                      onClick={() => setPagamentoParaEstornar(pagamento)}
                    >
                      Estornar
                    </button>
                  )}
                  {jaEstornado && <span className="formulario-ajuda">estornado</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {pagamentoParaEstornar && (
        <EstornarPagamentoForm
          pagamento={pagamentoParaEstornar}
          onSucesso={() => {
            setPagamentoParaEstornar(null)
            recarregar()
          }}
          onCancelar={() => setPagamentoParaEstornar(null)}
        />
      )}
    </div>
  )
}

function EstornarPagamentoForm({ pagamento, onSucesso, onCancelar }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await estornarPagamento(pagamento.id, motivo.trim())
      onSucesso()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="formulario">
      <p className="formulario-subtitulo">
        Estornar {NOMES_FORMA[pagamento.forma] ?? pagamento.forma} de {formatarReais(pagamento.valor)}
      </p>

      <label htmlFor="motivo-estorno">Motivo do estorno *</label>
      <input
        id="motivo-estorno"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        required
        placeholder="Ex.: valor cobrado errado, pagamento duplicado"
      />

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      <div className="formulario-acoes">
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="botao-primario" disabled={enviando}>
          {enviando ? 'Estornando...' : 'Confirmar estorno'}
        </button>
      </div>
    </form>
  )
}
