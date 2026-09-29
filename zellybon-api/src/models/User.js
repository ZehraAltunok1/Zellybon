import mongoose from 'mongoose';
import {
  STARTING_JOKERS, STARTING_BOOSTERS, STARTING_NAKIS_JOKERS, LIVES_MAX, livesInfo, nextChest,
} from '../rewards.js';

const levelProgressSchema = new mongoose.Schema(
  {
    stars: { type: Number, default: 0 },
    best: { type: Number, default: 0 },
  },
  { _id: false },
);

const counter = (start) => ({ type: Number, default: start, min: 0 });

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
  coins: counter(0),

  // Ana oyun (Jöle Atış)
  mainLevel: { type: Number, default: 1 }, // açılmış en yüksek bölüm
  lives: { type: Number, default: LIVES_MAX, min: 0 },
  livesAt: { type: Date, default: Date.now },
  boosters: {
    extraSlot: counter(STARTING_BOOSTERS.extraSlot),
    superStart: counter(STARTING_BOOSTERS.superStart),
  },

  // Nakış
  nakisLevel: { type: Number, default: 1 }, // açılmış en yüksek tablo
  nakisJokers: {
    scissors: counter(STARTING_NAKIS_JOKERS.scissors),
    needle: counter(STARTING_NAKIS_JOKERS.needle),
    box: counter(STARTING_NAKIS_JOKERS.box),
    magnet: counter(STARTING_NAKIS_JOKERS.magnet),
  },

  // Jöle Patlat
  jokers: {
    hammer: counter(STARTING_JOKERS.hammer),
    shuffle: counter(STARTING_JOKERS.shuffle),
    colorBomb: counter(STARTING_JOKERS.colorBomb),
    hourglass: counter(STARTING_JOKERS.hourglass),
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

userSchema.methods.publicBoosters = function publicBoosters() {
  const b = this.boosters ?? {};
  return { extraSlot: b.extraSlot ?? 0, superStart: b.superStart ?? 0 };
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
    coins: this.coins ?? 0,
    mainLevel: this.mainLevel,
    nextChest: nextChest(this.mainLevel),
    nakisLevel: this.nakisLevel ?? 1,
    nakisJokers: {
      scissors: this.nakisJokers?.scissors ?? 0,
      needle: this.nakisJokers?.needle ?? 0,
      box: this.nakisJokers?.box ?? 0,
      magnet: this.nakisJokers?.magnet ?? 0,
    },
    lives: livesInfo(this),
    boosters: this.publicBoosters(),
    jokers: this.publicJokers(),
    levels: this.publicLevels(),
  };
};

export default mongoose.model('User', userSchema);
