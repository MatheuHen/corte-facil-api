const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// Importa as rotas depois de configurar o app
const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api/usuarios', usuarioRoutes);

// Inicializa o banco de dados (MongoDB com fallback para SQLite)
initDatabase().catch(err => {
  console.error('Erro fatal ao inicializar banco de dados:', err);
  process.exit(1);
});

// Rota principal de teste
app.get('/', (req, res) => {
  res.send('Backend rodando com sucesso!');
});

// Sobe o servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
