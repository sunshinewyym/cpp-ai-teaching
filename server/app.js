require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const chatRouter = require('./routes/chat');
const openerRouter = require('./routes/opener');
const edgeCaseRouter = require('./routes/edgeCase');
const teachingRouter = require('./routes/teaching');
const newsRouter = require('./routes/news');
const coachRouter = require('./routes/coach');
const authRouter = require('./routes/auth');
const practiceRouter = require('./routes/practice');
const feedbackRouter = require('./routes/feedback');
const trainingCoursesRouter = require('./routes/trainingCourses');
const leaderboardRouter = require('./routes/leaderboard');
const { loadQuestionBank } = require('./training/questionBank');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve static files (panel.html etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', async (req, res) => {
  const defaultRunnerMode = process.env.NODE_ENV === 'production' ? 'runner' : 'local';
  const runnerRequired = String(process.env.CODE_RUNNER_MODE || defaultRunnerMode).toLowerCase() === 'runner';
  const runnerSocket = process.env.RUNNER_SOCKET_PATH || '/run/cpp-runner/runner.sock';
  const runnerReady = !runnerRequired || fs.existsSync(runnerSocket);
  let questionBankReady = true;
  try {
    await loadQuestionBank();
  } catch (error) {
    questionBankReady = false;
    console.error('[Health] 题库加载失败:', error.message);
  }
  const ready = runnerReady && questionBankReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    runner: runnerRequired ? (runnerReady ? 'ready' : 'unavailable') : 'local',
    questionBank: questionBankReady ? 'ready' : 'unavailable',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/opener', openerRouter);
app.use('/api/edge-case', edgeCaseRouter);
app.use('/api', teachingRouter);
app.use('/api/news', newsRouter);
app.use('/api/coach', coachRouter);
app.use('/api/auth', authRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/training-courses', trainingCoursesRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`局域网访问: http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
