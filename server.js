import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import fs from 'fs';

import authRoutes from './routes/authRoutes.js';
import toolRoutes from './routes/toolRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// মিডলওয়্যার কনফিগারেশন
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ফ্রন্টএন্ড স্ট্যাটিক ফাইল ফোল্ডার
app.use(express.static(path.join(__dirname, 'public')));

// ব্যাকএন্ড API রাউটিং
app.use('/api/auth', authRoutes);
app.use('/api/tools', toolRoutes);

// প্রাইভেসি ও অটো-ক্লিনআপ ক্রন জব (প্রতি ৩০ মিনিট পর পর ১৫ মিনিটের পুরনো ফাইল ডিলিট)
cron.schedule('*/30 * * * *', () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    for (const file of files) {
      const p = path.join(uploadsDir, file);
      try {
        const stats = fs.statSync(p);
        if (now - stats.mtimeMs > 15 * 60 * 1000) {
          fs.unlinkSync(p);
        }
      } catch (e) {}
    }
  }
});

// সিঙ্গেল পেজ অ্যাপ্লিকেশনের ফলব্যাক রুট
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 ShopPro Server is running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
