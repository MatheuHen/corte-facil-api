const request = require('supertest');
const app = require('../../index');

describe('Testes de integração - Agendamentos', () => {
  it('Deve retornar 200 ao acessar GET /agendamentos', async () => {
    const resposta = await request(app).get('/agendamentos');
    expect(resposta.status).toBe(200);
  });
});
