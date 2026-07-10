require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatRouter = require('./routes/chat');
const openerRouter = require('./routes/opener');
const edgeCaseRouter = require('./routes/edgeCase');
const teachingRouter = require('./routes/teaching');
const newsRouter = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve static files (panel.html etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/opener', openerRouter);
app.use('/api/edge-case', edgeCaseRouter);
app.use('/api', teachingRouter);
app.use('/api/news', newsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
