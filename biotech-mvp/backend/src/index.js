const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const bdRoutes = require('./routes/bds');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const chatRoutes = require('./routes/chat');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// ── 基础中间件 ────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── 路由 ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/bds', authenticate, bdRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/chat', authenticate, chatRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 错误处理 ──────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => console.log(`BioLink API running on port ${PORT}`));
module.exports = app;
