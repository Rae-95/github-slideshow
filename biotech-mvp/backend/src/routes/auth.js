const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../services/db');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, displayName, companyName, creditCode } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: '邮箱、密码和角色为必填项' });
    }
    if (!['enterprise', 'bd'].includes(role)) {
      return res.status(400).json({ message: '角色无效，仅支持 enterprise 或 bd' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: '密码至少8位' });
    }

    // 检查邮箱是否已注册
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: '该邮箱已注册' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const status = role === 'enterprise' ? 'pending' : 'pending'; // 均需审核

    // 创建用户
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, role, display_name, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, display_name, status`,
      [email, passwordHash, role, displayName || companyName, status]
    );
    const user = userResult.rows[0];

    // 创建对应档案
    if (role === 'enterprise') {
      await db.query(
        `INSERT INTO enterprises (user_id, company_name, credit_code, status)
         VALUES ($1, $2, $3, 'pending')`,
        [user.id, companyName, creditCode]
      );
    } else if (role === 'bd') {
      await db.query(
        `INSERT INTO bd_profiles (user_id, code_name, status, credit_score)
         VALUES ($1, $2, 'pending', 60)`,
        [user.id, `BD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`]
      );
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码为必填项' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, role, display_name, status FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: '用户不存在' });

    res.json({ user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
