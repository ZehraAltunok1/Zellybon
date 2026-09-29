import mongoose from 'mongoose';

export async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI tanımlı değil (.env dosyasını kontrol et).');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB bağlantısı kuruldu.');
}
