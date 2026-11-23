// Testes unitários de registrarEntrada — foco na normalização de placa (bug
// encontrado em revisão: busca por placa era case-sensitive e só o frontend
// normalizava, então "abc1234" driblava o check de "veículo já está dentro").

jest.mock('../../src/repositories/turnoRepository', () => ({ findAbertoPorUsuario: jest.fn() }));
jest.mock('../../src/repositories/vagaRepository', () => ({ findById: jest.fn() }));
jest.mock('../../src/repositories/veiculoRepository', () => ({ findByPlaca: jest.fn(), create: jest.fn() }));
jest.mock('../../src/repositories/tarifaRepository', () => ({ buscarVigente: jest.fn() }));
jest.mock('../../src/repositories/movimentacaoRepository', () => ({
  findAbertaPorVaga: jest.fn(),
  findAbertaPorVeiculo: jest.fn(),
  registrarEntrada: jest.fn(),
}));

const turnoRepository = require('../../src/repositories/turnoRepository');
const vagaRepository = require('../../src/repositories/vagaRepository');
const veiculoRepository = require('../../src/repositories/veiculoRepository');
const tarifaRepository = require('../../src/repositories/tarifaRepository');
const movimentacaoRepository = require('../../src/repositories/movimentacaoRepository');
const movimentacaoService = require('../../src/services/movimentacaoService');

beforeEach(() => {
  jest.clearAllMocks();
  turnoRepository.findAbertoPorUsuario.mockResolvedValue({ id: 9 });
  vagaRepository.findById.mockResolvedValue({ id: 1, bloqueada: false });
  movimentacaoRepository.findAbertaPorVaga.mockResolvedValue(null);
  tarifaRepository.buscarVigente.mockResolvedValue({ id: 1 });
  movimentacaoRepository.registrarEntrada.mockResolvedValue({ id: 100 });
});

describe('movimentacaoService.registrarEntrada — normalização de placa', () => {
  test('busca e cadastra a placa sempre em maiúsculas e sem espaços, mesmo se o cliente mandar diferente', async () => {
    veiculoRepository.findByPlaca.mockResolvedValue([]);
    veiculoRepository.create.mockResolvedValue({ id: 5 });

    await movimentacaoService.registrarEntrada({
      veiculo: { placa: '  abc1234  ', tipo: 'carro' },
      vagaId: 1,
      usuarioId: 5,
    });

    expect(veiculoRepository.findByPlaca).toHaveBeenCalledWith('ABC1234');
    expect(veiculoRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ placa: 'ABC1234' })
    );
  });

  test('reconhece o veículo já cadastrado independentemente da caixa da placa enviada', async () => {
    veiculoRepository.findByPlaca.mockResolvedValue([{ id: 7, placa: 'ABC1234' }]);
    movimentacaoRepository.findAbertaPorVeiculo.mockResolvedValue({ id: 42 }); // já está dentro

    await expect(
      movimentacaoService.registrarEntrada({
        veiculo: { placa: 'abc1234', tipo: 'carro' },
        vagaId: 1,
        usuarioId: 5,
      })
    ).rejects.toThrow('veículo já está dentro do estacionamento');

    expect(veiculoRepository.create).not.toHaveBeenCalled();
  });
});

// Bug do teste com o celular (10/11/2026): o telefone foi gravado sem o 55
// ("51995575290") e a notificação nunca saiu.
describe('movimentacaoService.registrarEntrada — telefone de contato', () => {
  beforeEach(() => {
    veiculoRepository.findByPlaca.mockResolvedValue([]);
    veiculoRepository.create.mockResolvedValue({ id: 5 });
  });

  const entrar = (telefoneContato) =>
    movimentacaoService.registrarEntrada({
      veiculo: { placa: 'ABC1234', tipo: 'carro' },
      vagaId: 1,
      usuarioId: 5,
      telefoneContato,
    });

  test('grava o telefone com o 55 na frente quando o operador digita só DDD + número', async () => {
    await entrar('(51) 99557-5290');
    expect(movimentacaoRepository.registrarEntrada).toHaveBeenCalledWith(
      expect.objectContaining({ telefoneContato: '5551995575290' })
    );
  });

  test('telefone vazio não impede a entrada e é gravado como null', async () => {
    await entrar('   ');
    expect(movimentacaoRepository.registrarEntrada).toHaveBeenCalledWith(
      expect.objectContaining({ telefoneContato: null })
    );
  });

  test('telefone em formato irreconhecível é recusado com mensagem clara, sem gravar nada', async () => {
    await expect(entrar('12345')).rejects.toThrow('telefone inválido');
    expect(movimentacaoRepository.registrarEntrada).not.toHaveBeenCalled();
  });
});
