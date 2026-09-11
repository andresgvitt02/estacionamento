// Evita repetir try/catch em cada rota async: qualquer rejeição da Promise
// cai automaticamente no errorHandler, em vez de travar o processo.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
