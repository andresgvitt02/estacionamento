import { useEffect, useState } from 'react'
import { buscarTarifaVigente, criarTarifa, listarTarifas } from '../api/tarifas'
import { formatarReais, formatarData } from '../utils/formato'

const CAMPOS_INICIAIS = {
  descricao: '',
  valorHora: '',
  toleranciaMinutos: '0',
  percentualFracao: '100',
  minutosFracao: '60',
  arredondamento: '0.50',
  dataInicio: '',
}

export default function Tarifas() {
  const [vigente, setVigente] = useState(null)
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [campos, setCampos] = useState(CAMPOS_INICIAIS)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  async function recarregar() {
    const [tarifaVigente, todas] = await Promise.all([buscarTarifaVigente(), listarTarifas()])
    setVigente(tarifaVigente)
    setHistorico(todas)
  }

  useEffect(() => {
    recarregar()
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false))
  }, [])

  function aoMudarCampo(campo) {
    return (evento) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }))
  }

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    setEnviando(true)
    try {
      await criarTarifa({
        descricao: campos.descricao.trim(),
        valorHora: Number(campos.valorHora),
        toleranciaMinutos: Number(campos.toleranciaMinutos),
        percentualFracao: Number(campos.percentualFracao),
        minutosFracao: Number(campos.minutosFracao),
        arredondamento: Number(campos.arredondamento),
        ...(campos.dataInicio ? { dataInicio: new Date(campos.dataInicio).toISOString() } : {}),
      })
      setSucesso('Nova tarifa cadastrada. A anterior teve a vigência encerrada automaticamente.')
      setCampos(CAMPOS_INICIAIS)
      await recarregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p>Carregando tarifas...</p>

  return (
    <section>
      <h1>Tarifas</h1>

      <div className="pagina-cabecalho">
        {vigente ? (
          <div>
            <p className="formulario-subtitulo">Tarifa vigente</p>
            <p>
              <strong>{vigente.descricao}</strong> — {formatarReais(vigente.valor_hora)}/hora, tolerância de{' '}
              {vigente.tolerancia_minutos} min. Excedente: {vigente.percentual_fracao}% a cada{' '}
              {vigente.minutos_fracao} min. Arredonda para {formatarReais(vigente.arredondamento)}.
            </p>
          </div>
        ) : (
          <p className="mensagem-aviso">Nenhuma tarifa vigente cadastrada — cadastre uma abaixo antes de operar.</p>
        )}
      </div>

      <div className="pagina-colunas">
        <form onSubmit={aoSubmeter} className="formulario">
          <p className="formulario-subtitulo">
            Cadastrar nova tarifa. Não edita a atual — encerra a vigência dela e cria esta como a nova vigente (ver
            CLAUDE.md, "Tarifa tem vigência temporal").
          </p>

          <label htmlFor="descricao">Descrição *</label>
          <input
            id="descricao"
            value={campos.descricao}
            onChange={aoMudarCampo('descricao')}
            required
            placeholder="Ex: Tabela 2026"
          />

          <label htmlFor="valor-hora">Valor da hora (R$) *</label>
          <input
            id="valor-hora"
            type="number"
            min="0.01"
            step="0.01"
            value={campos.valorHora}
            onChange={aoMudarCampo('valorHora')}
            required
          />

          <label htmlFor="tolerancia">Tolerância (min)</label>
          <input
            id="tolerancia"
            type="number"
            min="0"
            step="1"
            value={campos.toleranciaMinutos}
            onChange={aoMudarCampo('toleranciaMinutos')}
          />

          <label htmlFor="percentual-fracao">Percentual do excedente (%)</label>
          <input
            id="percentual-fracao"
            type="number"
            min="0.01"
            step="0.01"
            value={campos.percentualFracao}
            onChange={aoMudarCampo('percentualFracao')}
          />

          <label htmlFor="minutos-fracao">Fração do excedente (min)</label>
          <input
            id="minutos-fracao"
            type="number"
            min="1"
            step="1"
            value={campos.minutosFracao}
            onChange={aoMudarCampo('minutosFracao')}
          />

          <label htmlFor="arredondamento">Arredondar valor final para múltiplo de (R$)</label>
          <input
            id="arredondamento"
            type="number"
            min="0.01"
            step="0.01"
            value={campos.arredondamento}
            onChange={aoMudarCampo('arredondamento')}
          />

          <label htmlFor="data-inicio">Vigorar a partir de (opcional, padrão agora)</label>
          <input
            id="data-inicio"
            type="datetime-local"
            value={campos.dataInicio}
            onChange={aoMudarCampo('dataInicio')}
          />

          {erro && (
            <p role="alert" className="mensagem-erro">
              {erro}
            </p>
          )}
          {sucesso && <p className="mensagem-sucesso">{sucesso}</p>}

          <div className="formulario-acoes">
            <button type="submit" className="botao-primario" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Cadastrar tarifa'}
            </button>
          </div>
        </form>

        <div>
          <p className="formulario-subtitulo">Histórico</p>
          {historico.length === 0 ? (
            <p>Nenhuma tarifa cadastrada ainda.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor/hora</th>
                  <th>Início</th>
                  <th>Fim</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((tarifa) => (
                  <tr key={tarifa.id}>
                    <td>{tarifa.descricao}</td>
                    <td>{formatarReais(tarifa.valor_hora)}</td>
                    <td>{formatarData(tarifa.data_inicio)}</td>
                    <td>{tarifa.data_fim ? formatarData(tarifa.data_fim) : 'vigente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}
