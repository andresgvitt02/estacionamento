const jwt = require('jsonwebtoken');
const ApiError = require('../errors/ApiError');

// Aplica-se a toda rota sob /api, exceto /api/auth/login (ver app.js). Lê o
// token do header Authorization, valida e popula req.usuario — dali em
// diante, nenhuma rota deve confiar em usuarioId/turnoId vindo do body pra
// identificar quem está agindo (mesmo princípio de "o servidor recalcula o
// valor, sempre", aplicado agora à identidade de quem faz a requisição).
function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new ApiError(401, 'token de autenticação ausente');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, nome: payload.nome, perfil: payload.perfil };
    next();
  } catch {
    throw new ApiError(401, 'token de autenticação inválido ou expirado');
  }
}

module.exports = autenticar;
