import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['quick'], default: 'quick' },
  score: { type: Number, required: true },
  maxCombo: { type: Number, default: 0 },
  jelliesPopped: { type: Number, default: 0 },
  durationMs: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

scoreSchema.index({ mode: 1, score: -1 });
scoreSchema.index({ userId: 1, mode: 1, score: -1 });
scoreSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Score', scoreSchema);
