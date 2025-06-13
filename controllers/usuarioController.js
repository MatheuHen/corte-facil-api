const Usuario = require('../models/Usuario');
const Agendamento = require('../models/Agendamento');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Cadastro
exports.cadastrar = async (req, res) => {
  try {
    const { nome, email, senha, tipo } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    // Verificar se o usuário já existe
    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    await Usuario.criar({ nome, email, senha: senhaCriptografada, tipo: tipo || 'cliente', telefone: req.body.telefone || '' });

    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (erro) {
    console.error('Erro no cadastro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validações
    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) {
      return res.status(404).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const userId = usuario._id || usuario.id;
    const token = jwt.sign(
      { id: userId, tipo: usuario.tipo, nome: usuario.nome }, 
      process.env.JWT_SECRET || 'segredo_temporario', 
      { expiresIn: '24h' }
    );

    res.json({ 
      mensagem: 'Login realizado com sucesso!', 
      token,
      usuario: {
        id: userId,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      }
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Criar agendamento
exports.criarAgendamento = async (req, res) => {
  try {
    const { clienteId, data, horario, servico, observacoes } = req.body;

    // Validações
    if (!clienteId || !data || !horario || !servico) {
      return res.status(400).json({ erro: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    // Verificar se o cliente existe
    const cliente = await Usuario.buscarPorId(clienteId);
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    // Verificar se a data é no futuro
    const dataAgendamento = new Date(data);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (dataAgendamento < hoje) {
      return res.status(400).json({ erro: 'A data do agendamento deve ser hoje ou no futuro.' });
    }

    // Verificar disponibilidade do horário
    const agendamentoExistente = await Agendamento.verificarDisponibilidade(data, horario);
    if (agendamentoExistente) {
      return res.status(400).json({ erro: 'Este horário já está ocupado.' });
    }

    // Criar novo agendamento
    const novoAgendamento = await Agendamento.criar({
      clienteId,
      clienteNome: cliente.nome,
      data: dataAgendamento,
      horario,
      servico,
      observacoes: observacoes || '',
      status: 'agendado'
    });

    res.status(201).json({
      mensagem: 'Agendamento criado com sucesso!',
      agendamento: {
        id: novoAgendamento._id || novoAgendamento.id,
        data: novoAgendamento.data,
        horario: novoAgendamento.horario,
        servico: novoAgendamento.servico,
        status: novoAgendamento.status,
        clienteNome: novoAgendamento.clienteNome
      }
    });
  } catch (erro) {
    console.error('Erro ao criar agendamento:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Listar agendamentos do cliente
exports.listarAgendamentos = async (req, res) => {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      return res.status(400).json({ erro: 'ID do cliente é obrigatório.' });
    }

    const agendamentos = await Agendamento.buscarPorCliente(clienteId);

    res.json({
      agendamentos: agendamentos.map(ag => ({
        id: ag._id || ag.id,
        data: ag.data,
        horario: ag.horario,
        servico: ag.servico,
        status: ag.status,
        barbeiroNome: ag.barbeiroNome,
        observacoes: ag.observacoes,
        dataCriacao: ag.dataCriacao || ag.createdAt
      }))
    });
  } catch (erro) {
    console.error('Erro ao listar agendamentos:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Cancelar agendamento
exports.cancelarAgendamento = async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const { clienteId } = req.body;

    if (!agendamentoId || !clienteId) {
      return res.status(400).json({ erro: 'ID do agendamento e cliente são obrigatórios.' });
    }

    const agendamento = await Agendamento.buscarPorId(agendamentoId);
    if (!agendamento) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }

    // Verificar se o agendamento pertence ao cliente
    const agendamentoClienteId = agendamento.clienteId.toString ? agendamento.clienteId.toString() : agendamento.clienteId;
    if (agendamentoClienteId !== clienteId) {
      return res.status(403).json({ erro: 'Você não tem permissão para cancelar este agendamento.' });
    }

    // Verificar se o agendamento pode ser cancelado
    if (agendamento.status === 'cancelado') {
      return res.status(400).json({ erro: 'Este agendamento já foi cancelado.' });
    }

    if (agendamento.status === 'concluido') {
      return res.status(400).json({ erro: 'Não é possível cancelar um agendamento já concluído.' });
    }

    // Cancelar agendamento
    await Agendamento.atualizar(agendamentoId, { status: 'cancelado' });

    res.json({ mensagem: 'Agendamento cancelado com sucesso!' });
  } catch (erro) {
    console.error('Erro ao cancelar agendamento:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Listar horários disponíveis
exports.listarHorariosDisponiveis = async (req, res) => {
  try {
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ erro: 'Data é obrigatória.' });
    }

    const horariosDisponiveis = [
      '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
    ];

    // Buscar agendamentos existentes para a data
    const agendamentosExistentes = await Agendamento.buscarPorData(data);

    const horariosOcupados = agendamentosExistentes
      .filter(ag => ag.status === 'agendado' || ag.status === 'confirmado')
      .map(ag => ag.horario);
    
    const horariosLivres = horariosDisponiveis.filter(horario => !horariosOcupados.includes(horario));

    res.json({ horariosDisponiveis: horariosLivres });
  } catch (erro) {
    console.error('Erro ao listar horários disponíveis:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor. Tente novamente.' });
  }
};

// Função auxiliar para enviar notificação
async function enviarNotificacao(clienteId, mensagem) {
  try {
    // Implementar lógica de envio de notificação (email, SMS, push, etc.)
    // Por enquanto, apenas log
    console.log(`Notificação para cliente ${clienteId}: ${mensagem}`);
    return true;
  } catch (erro) {
    console.error('Erro ao enviar notificação:', erro);
    return false;
  }
}
