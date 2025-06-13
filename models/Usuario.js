const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { getDatabase } = require('../config/database');

// Schema do MongoDB
const usuarioSchemaMongoose = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  senha: {
    type: String,
    required: true,
    minlength: 6
  },
  telefone: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  tipo: {
    type: String,
    enum: ['cliente', 'barbeiro'],
    default: 'cliente'
  }
}, {
  timestamps: true
});

const UsuarioMongoose = mongoose.model('Usuario', usuarioSchemaMongoose);

// Modelo híbrido que funciona com ambos os bancos
class Usuario {
  static async criar(dadosUsuario) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      const usuario = new UsuarioMongoose(dadosUsuario);
      return await usuario.save();
    } else {
      // SQLite - usar modelo já definido
      const UsuarioSequelize = db.models.Usuario;
      return await UsuarioSequelize.create(dadosUsuario);
    }
  }
  
  static async buscarPorEmail(email) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await UsuarioMongoose.findOne({ email });
    } else {
      // SQLite - usar modelo já definido
      const UsuarioSequelize = db.models.Usuario;
      return await UsuarioSequelize.findOne({ where: { email } });
    }
  }
  
  static async buscarPorId(id) {
    const { db, isMongoose } = getDatabase();
    
    if (isMongoose) {
      return await UsuarioMongoose.findById(id);
    } else {
      // SQLite - usar modelo já definido
      const UsuarioSequelize = db.models.Usuario;
      return await UsuarioSequelize.findByPk(id);
    }
  }
}

module.exports = Usuario;
