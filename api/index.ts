import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Путь к папке со статикой (Vercel сам раздает статику из dist)
// Но оставляем на случай, если нужно

// API здоровье-чек
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Экспорт для Vercel Serverless
export default app;