const express = require('express');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Здоровье-чек
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Все остальные API запросы
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = app;