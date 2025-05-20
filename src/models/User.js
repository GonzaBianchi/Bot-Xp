// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  lastMessage: { type: Date, default: Date.now }
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

// Crear un índice compuesto para mejorar las búsquedas
userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Índice para facilitar el ordenamiento por nivel y XP
userSchema.index({ guildId: 1, level: -1, xp: -1 });

export default mongoose.model('User', userSchema);