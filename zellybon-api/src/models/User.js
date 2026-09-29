import mongoose from 'mongoose';
import { STARTING_JOKERS, LIVES_MAX, livesInfo } from '../rewards.js';

const levelProgressSchema = new mongoose.Schema(
  {
    stars: { type: Number, default: 0 },
    best: { type: Number, default: 0 },
  },
  { _id: false },
);

const jokerField = (type) => ({ type: Number, default: STARTING_JOKERS[type], min: 0 });

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

  // Ana oyun (Jöle Atış)
  mainLevel: { type: Number, default: 1 }, // açılmış en yüksek bölüm
  lives: { type: Number, default: LIVES_MAX, min: 0 },
  livesAt: { type: Date, default: Date.now },

  // Jöle Patlat
  jokers: {
    hammer: jokerField('hammer'),
    shuffle: jokerField('shuffle'),
    colorBomb: jokerField('colorBomb'),
    hourglass: jokerField('hourglass'),
  },
  // Bölüm numarası → { stars, best }
  levels: { type: Map, of: levelProgressSchema, default: {} },

  createdAt: { type: Date, default: Date.now },
});

userSchema.methods.publicJokers = function publicJokers() {
  const j = this.jokers ?? {};
  return {
    hammer: j.hammer ?? 0,
    shuffle: j.shuffle ?? 0,
    colorBomb: j.colorBomb ?? 0,
    hourglass: j.hourglass ?? 0,
  };
};

userSchema.methods.publicLevels = function publicLevels() {
  const out = {};
  for (const [id, p] of this.levels ?? []) out[id] = { stars: p.stars, best: p.best };
  return out;
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    username: this.username,
    bestScore: this.bestScore,
    mainLevel: this.mainLevel,
    lives: livesInfo(this),
    jokers: this.publicJokers(),
    levels: this.publicLevels(),
  };
};

export default mongoose.model('User', userSchema);
