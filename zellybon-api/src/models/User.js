import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 16,
    match: /^[a-z0-9_]+$/,
  },
  passwordHash: { type: String, required: true },
  bestScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, username: this.username, bestScore: this.bestScore };
};

export default mongoose.model('User', userSchema);
