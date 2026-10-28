const ApiError = require('../errors/ApiError');

// Uso: router.post('/', autenticar, exigirPerfil('admin'), handler).
// Precisa rodar depois de `autenticar` (que popula req.usuario).
function exigirPerfil(...perfisPermitidos) {
  return function (req, res, next) {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      throw new ApiError(403, 'sem permissão para esta ação');
    }
    next();
  };
}

module.exports = exigirPerfil;
