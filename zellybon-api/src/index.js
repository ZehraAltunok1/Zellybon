import 'dotenv/config';
import { connectDb } from './db.js';
import { createApp } from './app.js';

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

createApp({ corsOrigin: CORS_ORIGIN }).listen(PORT, () => {
  console.log(`Zellybon API http://localhost:${PORT} adresinde çalışıyor.`);
});
