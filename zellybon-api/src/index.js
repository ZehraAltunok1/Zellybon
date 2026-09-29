import 'dotenv/config';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import User from './models/User.js';
import { STARTING_JOKERS } from './rewards.js';

const { MONGODB_URI, JWT_SECRET, PORT = 3000, CORS_ORIGIN = '' } = process.env;

if (!JWT_SECRET) {
  console.error('JWT_SECRET tanımlı değil (.env dosyasını kontrol et).');
  process.exit(1);
}

try {
  await connectDb(MONGODB_URI);
} catch (err) {
  console.error('Veritabanına bağlanılamadı:', err.message);
  process.exit(1);
}

// Joker alanı olmadan oluşturulmuş eski hesaplara başlangıç jokerlerini ver
// (atomik joker kullanımı alanın veritabanında gerçekten var olmasını gerektirir).
const migrated = await User.updateMany({ jokers: { $exists: false } }, { $set: { jokers: STARTING_JOKERS } });
if (migrated.modifiedCount) console.log(`${migrated.modifiedCount} hesaba başlangıç jokerleri verildi.`);

createApp({ corsOrigin: CORS_ORIGIN }).listen(PORT, () => {
  console.log(`Zellybon API http://localhost:${PORT} adresinde çalışıyor.`);
});
