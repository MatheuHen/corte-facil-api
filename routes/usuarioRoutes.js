const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Rotas de autenticação
router.post('/cadastrar', usuarioController.cadastrar);
router.post('/cadastro', usuarioController.cadastrar);
router.post('/login', usuarioController.login);

// Rotas de agendamentos
router.post('/agendamentos', usuarioController.criarAgendamento);
router.get('/agendamentos/:clienteId', usuarioController.listarAgendamentos);
router.put('/agendamentos/:agendamentoId/cancelar', usuarioController.cancelarAgendamento);
router.get('/horarios-disponiveis', usuarioController.listarHorariosDisponiveis);

module.exports = router;
