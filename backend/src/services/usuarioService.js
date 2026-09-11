const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');
const ApiError = require('../errors/ApiError');

// Cadastro de usuário: validação simples + hash da senha antes de persistir.
// `usuarios.senha_hash` nunca recebe senha em texto puro.
async function criar({ nome, email, senha, perfil }) {
  if (!senha || senha.length < 6) {
    throw new ApiError(400, 'senha deve ter ao menos 6 caracteres');
  }

  const existente = await usuarioRepository.findByEmail(email);
  if (existente) {
    throw new ApiError(409, 'já existe um usuário com esse e-mail');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  return usuarioRepository.create({ nome, email, senhaHash, perfil });
}

// Autenticação. Mensagem de erro é sempre a mesma (email não existe ou senha
// errada) — não dá pra distinguir os dois casos pra quem tenta logar, senão
// vira uma forma de descobrir quais e-mails têm conta cadastrada.
async function autenticar({ email, senha }) {
  const usuario = await usuarioRepository.findByEmail(email);
  const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

  if (!usuario || !usuario.ativo || !senhaConfere) {
    throw new ApiError(401, 'email ou senha inválidos');
  }

  if (!process.env.JWT_SECRET) {
    // Falha alto e cedo: token assinado sem segredo configurado não
    // protege nada (ver .env.example).
    throw new Error('JWT_SECRET não configurado');
  }

  const token = jwt.sign(
    { sub: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  };
}

module.exports = { criar, autenticar };
