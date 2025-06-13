const mongoose = require('mongoose');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

let db = null;
let isMongoose = false;

// Configuração do banco de dados
const initDatabase = async () => {
  try {
    // Tenta conectar com MongoDB primeiro
    const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/corte-facil';
    await mongoose.connect(DB_URI);
    console.log('MongoDB conectado com sucesso!');
    console.log('Banco de dados:', DB_URI);
    isMongoose = true;
    db = mongoose;
  } catch (mongoError) {
    console.log('MongoDB não disponível, usando SQLite como fallback...');
    console.log('Erro MongoDB:', mongoError.message);
    
    // Fallback para SQLite
    try {
      const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
      });
      
      await sequelize.authenticate();
      console.log('SQLite conectado com sucesso!');
      isMongoose = false;
      db = sequelize;
      
      // Criar tabelas se não existirem
      await createSQLiteTables(sequelize);
    } catch (sqliteError) {
      console.error('Erro ao conectar com SQLite:', sqliteError);
      process.exit(1);
    }
  }
};

// Criar tabelas SQLite
const createSQLiteTables = async (sequelize) => {
  // Tabela de usuários
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  // Tabela de agendamentos
  const Agendamento = sequelize.define('Agendamento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    clienteNome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    barbeiroId: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    barbeiroNome: {
      type: DataTypes.STRING,
      defaultValue: 'João Silva'
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    horario: {
      type: DataTypes.STRING,
      allowNull: false
    },
    servico: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'agendado'
    },
    observacoes: {
      type: DataTypes.TEXT
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 25.00
    }
  });

  await sequelize.sync();
  console.log('Tabelas SQLite criadas/verificadas com sucesso!');
  
  return { Usuario, Agendamento };
};

const getDatabase = () => {
  return { db, isMongoose };
};

module.exports = {
  initDatabase,
  getDatabase
};