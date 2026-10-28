import { useEffect, useState } from 'react'
import { atualizarUsuario, criarUsuario, desativarUsuario, listarUsuarios } from '../api/usuarios'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { formatarData } from '../utils/formato'

const CAMPOS_INICIAIS = { nome: '', email: '', senha: '', perfil: 'operador' }

export default function Usuarios() {
  const { usuario: usuarioLogado } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [campos, setCampos] = useState(CAMPOS_INICIAIS)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [usuarioParaEditar, setUsuarioParaEditar] = useState(null)

  async function recarregar() {
    setUsuarios(await listarUsuarios())
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
      await criarUsuario({
        nome: campos.nome.trim(),
        email: campos.email.trim(),
        senha: campos.senha,
        perfil: campos.perfil,
      })
      setSucesso('Usuário cadastrado.')
      setCampos(CAMPOS_INICIAIS)
      await recarregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function aoDesativar(usuario) {
    setErro(null)
    try {
      await desativarUsuario(usuario.id)
      await recarregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  if (carregando) return <p>Carregando usuários...</p>

  return (
    <section>
      <h1>Usuários</h1>

      <div className="pagina-colunas">
        <form onSubmit={aoSubmeter} className="formulario">
          <p className="formulario-subtitulo">Cadastrar novo operador ou administrador.</p>

          <label htmlFor="nome">Nome *</label>
          <input id="nome" value={campos.nome} onChange={aoMudarCampo('nome')} required />

          <label htmlFor="email">E-mail *</label>
          <input id="email" type="email" value={campos.email} onChange={aoMudarCampo('email')} required />

          <label htmlFor="senha">Senha *</label>
          <input
            id="senha"
            type="password"
            value={campos.senha}
            onChange={aoMudarCampo('senha')}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />

          <label htmlFor="perfil">Perfil</label>
          <select id="perfil" value={campos.perfil} onChange={aoMudarCampo('perfil')}>
            <option value="operador">Operador</option>
            <option value="admin">Admin</option>
          </select>

          {erro && (
            <p role="alert" className="mensagem-erro">
              {erro}
            </p>
          )}
          {sucesso && <p className="mensagem-sucesso">{sucesso}</p>}

          <div className="formulario-acoes">
            <button type="submit" className="botao-primario" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Cadastrar usuário'}
            </button>
          </div>
        </form>

        <div>
          <p className="formulario-subtitulo">Cadastrados</p>
          <div className="tabela-scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Desde</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td>{usuario.perfil === 'admin' ? 'Admin' : 'Operador'}</td>
                    <td>{usuario.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td>{formatarData(usuario.criado_em)}</td>
                    <td>
                      <div className="tabela-acoes">
                        <button
                          type="button"
                          className="botao-link"
                          onClick={() => setUsuarioParaEditar(usuario)}
                        >
                          Editar
                        </button>
                        {usuario.ativo && usuario.id !== usuarioLogado.id && (
                          <button type="button" className="botao-link" onClick={() => aoDesativar(usuario)}>
                            Desativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {usuarioParaEditar && (
        <Modal titulo="Editar usuário" onFechar={() => setUsuarioParaEditar(null)}>
          <EditarUsuarioForm
            usuario={usuarioParaEditar}
            onSucesso={() => {
              setUsuarioParaEditar(null)
              recarregar()
            }}
            onCancelar={() => setUsuarioParaEditar(null)}
          />
        </Modal>
      )}
    </section>
  )
}

function EditarUsuarioForm({ usuario, onSucesso, onCancelar }) {
  const [nome, setNome] = useState(usuario.nome)
  const [email, setEmail] = useState(usuario.email)
  const [perfil, setPerfil] = useState(usuario.perfil)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function aoSubmeter(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await atualizarUsuario(usuario.id, { nome: nome.trim(), email: email.trim(), perfil })
      onSucesso()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="formulario">
      <label htmlFor="edit-nome">Nome *</label>
      <input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

      <label htmlFor="edit-email">E-mail *</label>
      <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label htmlFor="edit-perfil">Perfil</label>
      <select id="edit-perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
        <option value="operador">Operador</option>
        <option value="admin">Admin</option>
      </select>

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
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
