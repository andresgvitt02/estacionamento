import { useEffect, useRef, useState } from 'react'
import { estimarValorSaida, registrarSaida } from '../api/movimentacoes'
import { arredondarCentavos as arredondar, formatarReais } from '../utils/formato'

const FORMAS = [
  { valor: 'dinheiro', texto: 'Dinheiro' },
  { valor: 'pix', texto: 'PIX' },
  { valor: 'cartao', texto: 'Cartão' },
]

export default function SaidaForm({ vaga, onSucesso, onCancelar }) {
  // Token gerado uma única vez, na abertura desta tela (CLAUDE.md,
  // "Idempotência na confirmação"). Reenviar com o mesmo token — duplo
  // clique, retry de rede — é rejeitado pelo backend, nunca gera um segundo
  // pagamento.
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  const [carregando, setCarregando] = useState(true)
  const [valorDevido, setValorDevido] = useState(null)
  const [pagamentos, setPagamentos] = useState([{ forma: 'dinheiro', valor: '', valorRecebido: '' }])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let ativo = true
    estimarValorSaida(vaga.movimentacao_id)
      .then(({ valorEstimado }) => {
        if (!ativo) return
        setValorDevido(valorEstimado)
        setPagamentos([{ forma: 'dinheiro', valor: String(valorEstimado), valorRecebido: '' }])
      })
      .catch((err) => ativo && setErro(err.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [vaga.movimentacao_id])

  const somaAlocada = arredondar(pagamentos.reduce((soma, p) => soma + (Number(p.valor) || 0), 0))
  const faltaAlocar = valorDevido === null ? 0 : arredondar(valorDevido - somaAlocada)

  function atualizarPagamento(indice, campo, valor) {
    setPagamentos((atual) => atual.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)))
  }

  function adicionarPagamento() {
    setPagamentos((atual) => [
      ...atual,
      { forma: 'pix', valor: faltaAlocar > 0 ? String(faltaAlocar) : '', valorRecebido: '' },
    ])
  }

  function removerPagamento(indice) {
    setPagamentos((atual) => atual.filter((_, i) => i !== indice))
  }

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)

    // Checagem só de UX (feedback antes de rodar a viagem até o servidor) — a
    // validação que vale de verdade é a do backend, que recalcula tudo de
    // novo (ver movimentacaoService.registrarSaida).
    if (faltaAlocar !== 0) {
      setErro(`A soma dos pagamentos precisa bater com o valor devido (falta alocar ${formatarReais(faltaAlocar)})`)
      return
    }

    setEnviando(true)
    try {
      const movimentacao = await registrarSaida(vaga.movimentacao_id, {
        pagamentos: pagamentos.map((p) => ({
          forma: p.forma,
          valor: Number(p.valor),
          ...(p.forma === 'dinheiro' ? { valorRecebido: Number(p.valorRecebido) } : {}),
        })),
        idempotencyKey: idempotencyKeyRef.current,
      })
      onSucesso(movimentacao)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p>Calculando valor...</p>

  return (
    <form onSubmit={aoSubmeter} className="formulario">
      <p className="formulario-subtitulo">
        Vaga <strong>{vaga.codigo}</strong>
        {vaga.placa && (
          <>
            {' '}
            — placa <strong>{vaga.placa}</strong>
          </>
        )}
      </p>

      {valorDevido !== null && (
        <p className="saida-valor-devido">
          Valor a cobrar agora: <strong>{formatarReais(valorDevido)}</strong>
        </p>
      )}

      {pagamentos.map((pagamento, indice) => (
        <fieldset key={indice} className="saida-pagamento">
          <legend>{pagamentos.length > 1 ? `Pagamento ${indice + 1}` : 'Pagamento'}</legend>

          <label htmlFor={`forma-${indice}`}>Forma</label>
          <select
            id={`forma-${indice}`}
            value={pagamento.forma}
            onChange={(e) => atualizarPagamento(indice, 'forma', e.target.value)}
          >
            {FORMAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.texto}
              </option>
            ))}
          </select>

          <label htmlFor={`valor-${indice}`}>Valor (R$)</label>
          <input
            id={`valor-${indice}`}
            type="number"
            min="0"
            step="0.01"
            value={pagamento.valor}
            onChange={(e) => atualizarPagamento(indice, 'valor', e.target.value)}
            required
          />

          {pagamento.forma === 'dinheiro' && (
            <>
              <label htmlFor={`recebido-${indice}`}>Valor recebido (R$)</label>
              <input
                id={`recebido-${indice}`}
                type="number"
                min="0"
                step="0.01"
                value={pagamento.valorRecebido}
                onChange={(e) => atualizarPagamento(indice, 'valorRecebido', e.target.value)}
                required
              />
              {pagamento.valorRecebido !== '' && (
                <p className="formulario-ajuda">
                  Troco: {formatarReais(arredondar(Number(pagamento.valorRecebido) - (Number(pagamento.valor) || 0)))}
                </p>
              )}
            </>
          )}

          {pagamentos.length > 1 && (
            <button type="button" className="botao-link" onClick={() => removerPagamento(indice)}>
              Remover este pagamento
            </button>
          )}
        </fieldset>
      ))}

      <button type="button" className="botao-secundario botao-pequeno" onClick={adicionarPagamento}>
        Dividir em outra forma de pagamento
      </button>

      <p className={faltaAlocar !== 0 ? 'mensagem-aviso' : 'formulario-ajuda'}>
        {faltaAlocar === 0 ? 'Valor totalmente alocado.' : `Falta alocar ${formatarReais(faltaAlocar)}.`}
      </p>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      <div className="formulario-acoes">
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="botao-primario" disabled={enviando || faltaAlocar !== 0}>
          {enviando ? 'Registrando...' : 'Confirmar saída'}
        </button>
      </div>
    </form>
  )
}
