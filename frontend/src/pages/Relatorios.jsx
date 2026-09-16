import { useState } from 'react'
import { buscarMovimentacoesPorPeriodo, buscarResumoTurnos, buscarTotaisPorFormaPagamento } from '../api/relatorios'
import { formatarReais, formatarData } from '../utils/formato'

const NOMES_FORMA = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão' }

// Converte um <input type="datetime-local"> (hora local, sem timezone) pra
// ISO antes de mandar pro backend — a query string não carrega timezone
// nenhum, então isso precisa acontecer no front.
function paraIso(valorDatetimeLocal) {
  return new Date(valorDatetimeLocal).toISOString()
}

function inicioDeHoje() {
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  return agora.toISOString().slice(0, 16)
}

function agora() {
  return new Date().toISOString().slice(0, 16)
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState({ inicio: inicioDeHoje(), fim: agora() })
  const [turnos, setTurnos] = useState(null)
  const [movimentacoes, setMovimentacoes] = useState(null)
  const [porForma, setPorForma] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  async function buscar(evento) {
    evento?.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const filtro = { inicio: paraIso(periodo.inicio), fim: paraIso(periodo.fim) }
      const [resumoTurnos, extratoMovimentacoes, totaisForma] = await Promise.all([
        buscarResumoTurnos(filtro),
        buscarMovimentacoesPorPeriodo(filtro),
        buscarTotaisPorFormaPagamento(filtro),
      ])
      setTurnos(resumoTurnos)
      setMovimentacoes(extratoMovimentacoes)
      setPorForma(totaisForma)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const carregouAlgumaVez = turnos !== null

  const faturamentoTotal = (porForma ?? []).reduce((soma, item) => soma + Number(item.total), 0)

  return (
    <section>
      <h1>Relatórios financeiros</h1>

      <form onSubmit={buscar} className="formulario formulario-linha">
        <label htmlFor="inicio">De</label>
        <input
          id="inicio"
          type="datetime-local"
          value={periodo.inicio}
          onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))}
          required
        />

        <label htmlFor="fim">Até</label>
        <input
          id="fim"
          type="datetime-local"
          value={periodo.fim}
          onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
          required
        />

        <button type="submit" className="botao-primario" disabled={carregando}>
          {carregando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {!carregouAlgumaVez && !erro && <p>Escolha um período e clique em "Buscar".</p>}

      {carregouAlgumaVez && (
        <>
          <h2>Totais por forma de pagamento</h2>
          {porForma.length === 0 ? (
            <p>Nenhum pagamento no período.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {porForma.map((item) => (
                  <tr key={item.forma}>
                    <td>{NOMES_FORMA[item.forma] ?? item.forma}</td>
                    <td>{formatarReais(item.total)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Total geral</th>
                  <th>{formatarReais(faturamentoTotal)}</th>
                </tr>
              </tbody>
            </table>
          )}

          <h2>Fechamentos de caixa</h2>
          {turnos.length === 0 ? (
            <p>Nenhum turno fechado no período.</p>
          ) : (
            <div className="tabela-scroll">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Operador</th>
                    <th>Abertura</th>
                    <th>Fechamento</th>
                    <th>Esperado</th>
                    <th>Declarado</th>
                    <th>Divergência</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((turno) => (
                    <tr key={turno.id}>
                      <td>{turno.usuario_nome}</td>
                      <td>{formatarData(turno.abertura)}</td>
                      <td>{formatarData(turno.fechamento)}</td>
                      <td>{formatarReais(turno.valor_esperado)}</td>
                      <td>{formatarReais(turno.valor_declarado)}</td>
                      <td className={Number(turno.divergencia) !== 0 ? 'valor-divergente' : undefined}>
                        {formatarReais(turno.divergencia)}
                      </td>
                      <td>{turno.observacoes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Movimentações do período</h2>
          {movimentacoes.length === 0 ? (
            <p>Nenhuma saída registrada no período.</p>
          ) : (
            <div className="tabela-scroll">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Vaga</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Valor cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id}>
                      <td>{mov.placa}</td>
                      <td>{mov.vaga_codigo}</td>
                      <td>{formatarData(mov.entrada)}</td>
                      <td>{formatarData(mov.saida)}</td>
                      <td>{formatarReais(mov.valor_cobrado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
