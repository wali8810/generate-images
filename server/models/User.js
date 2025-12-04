
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Senha hash
  picture: { type: String, default: '' },
  credits: { type: Number, default: 20 },
  isPremium: { type: Boolean, default: false },
  lastResetDate: { type: String }, // YYYY-MM-DD
  totalGenerated: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
