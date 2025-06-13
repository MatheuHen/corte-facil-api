const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { getDatabase } = require('../config/database');

const agendamentoSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  clienteNome: {
    type: String,
    required: true
  },
  barbeiroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false // Pode ser null se não especificado
  },
  barbeiroNome: {
    type: String,
    default: 'A definir'
  },
  data: {
    type: Date,
    required: true
  },
  horario: {
    type: String,
    required: true
  },
  servico: {
    type: String,
    required: true,
    enum: ['Corte de cabelo', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Bigode', 'Lavagem'],
    default: 'Corte de cabelo'
  },
  status: {
    type: String,
    enum: ['agendado', 'confirmado', 'cancelado', 'concluido'],
    default: 'agendado'
  },
  observacoes: {
    type: String,
    maxlength: 500
  },
  preco: {
    type: Number,
    min: 0
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware para atualizar dataAtualizacao
agendamentoSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  next();
});

// Índices para melhor performance
agendamentoSchema.index({ clienteId: 1, data: 1 });
agendamentoSchema.index({ barbeiroId: 1, data: 1 });
agendamentoSchema.index({ data: 1, horario: 1 });
agendamentoSchema.index({ status: 1 });

// Método para verificar se o agendamento é no futuro
agendamentoSchema.methods.isNoFuturo = function() {
  const agora = new Date();
  const dataAgendamento = new Date(this.data);
  return dataAgendamento > agora;
};

// Método para formatar data e horário
agendamentoSchema.methods.getDataHorarioFormatado = function() {
  const data = new Date(this.data);
  const dataFormatada = data.toLocaleDateString('pt-BR');
  return `${dataFormatada} às ${this.horario}`;
};

// Método estático para buscar agendamentos por cliente
agendamentoSchema.statics.buscarPorCliente = function(clienteId) {
  return this.find({ clienteId })
    .sort({ data: 1, horario: 1 })
    .populate('barbeiroId', 'nome');
};

// Método estático para buscar agendamentos por barbeiro
agendamentoSchema.statics.buscarPorBarbeiro = function(barbeiroId) {
  return this.find({ barbeiroId })
    .sort({ data: 1, horario: 1 })
    .populate('clienteId', 'nome');
};

// Método estático para verificar disponibilidade
agendamentoSchema.statics.verificarDisponibilidade = function(data, horario, barbeiroId = null) {
  const query = {
    data: new Date(data),
    horario,
    status: { $in: ['agendado', 'confirmado'] }
  };
  
  if (barbeiroId) {
    query.barbeiroId = barbeiroId;
  }
  
  return this.findOne(query);
};

const AgendamentoMongoose = mongoose.model('Agendamento', agendamentoSchema);

// Classe híbrida para funcionar com ambos os bancos
class Agendamento {
  static async criar(dadosAgendamento) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      const agendamento = new AgendamentoMongoose(dadosAgendamento);
      return await agendamento.save();
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      return await AgendamentoSequelize.create(dadosAgendamento);
    }
  }
  
  static async buscarPorCliente(clienteId) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await AgendamentoMongoose.find({ clienteId })
        .sort({ data: 1, horario: 1 });
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      return await AgendamentoSequelize.findAll({
        where: { clienteId },
        order: [['data', 'ASC'], ['horario', 'ASC']]
      });
    }
  }
  
  static async verificarDisponibilidade(data, horario, barbeiroId = null) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      const query = {
        data: new Date(data),
        horario,
        status: { $in: ['agendado', 'confirmado'] }
      };
      
      if (barbeiroId) {
        query.barbeiroId = barbeiroId;
      }
      
      return await AgendamentoMongoose.findOne(query);
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      
      const whereClause = {
        data,
        horario,
        status: ['agendado', 'confirmado']
      };
      
      if (barbeiroId) {
        whereClause.barbeiroId = barbeiroId;
      }
      
      return await AgendamentoSequelize.findOne({ where: whereClause });
    }
  }
  
  static async buscarPorId(id) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await AgendamentoMongoose.findById(id);
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      return await AgendamentoSequelize.findByPk(id);
    }
  }
  
  static async atualizar(id, dadosAtualizacao) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await AgendamentoMongoose.findByIdAndUpdate(id, dadosAtualizacao, { new: true });
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      await AgendamentoSequelize.update(dadosAtualizacao, { where: { id } });
      return await AgendamentoSequelize.findByPk(id);
    }
  }

  static async buscarPorData(data) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await AgendamentoMongoose.find({
        data: new Date(data)
      });
    } else {
      // SQLite
      const AgendamentoSequelize = db.define('Agendamento', {
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
      
      await db.sync();
      return await AgendamentoSequelize.findAll({
        where: { data }
      });
    }
  }
}

module.exports = Agendamento;