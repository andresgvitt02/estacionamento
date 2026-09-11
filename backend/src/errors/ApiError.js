// Erro de aplicação com status HTTP embutido, pra rota/service poder fazer
// `throw new ApiError(404, 'vaga não encontrada')` e o errorHandler traduzir
// isso numa resposta JSON consistente.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = ApiError;
