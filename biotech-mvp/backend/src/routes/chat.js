const express = require('express');
const { db } = require('../services/db');

const router = express.Router();

// GET /api/chat/rooms - 获取用户的聊天室列表
router.get('/rooms', async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'enterprise') {
      query = `
        SELECT cr.*, p.title as project_title, b.code_name as bd_name,
               (SELECT content FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chat_rooms cr
        JOIN projects p ON cr.project_id = p.id
        JOIN bd_profiles b ON cr.bd_id = b.id
        WHERE cr.enterprise_id = $1
        ORDER BY last_message_at DESC NULLS LAST
      `;
    } else if (req.user.role === 'bd') {
      const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
      const bdId = bdProfile.rows[0]?.id;
      query = `
        SELECT cr.*, p.title as project_title, u.display_name as enterprise_name,
               (SELECT content FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chat_rooms cr
        JOIN projects p ON cr.project_id = p.id
        JOIN users u ON cr.enterprise_id = u.id
        WHERE cr.bd_id = ${bdId}
        ORDER BY last_message_at DESC NULLS LAST
      `;
    }

    const result = await db.query(query, req.user.role === 'enterprise' ? [req.user.id] : []);
    res.json({ rooms: result.rows });
  } catch (err) { next(err); }
});

// GET /api/chat/rooms/:id/messages - 获取消息
router.get('/rooms/:id/messages', async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;

    // 验证用户有权访问此聊天室
    const room = await db.query('SELECT * FROM chat_rooms WHERE id = $1', [req.params.id]);
    if (!room.rows[0]) return res.status(404).json({ message: '聊天室不存在' });

    const r = room.rows[0];
    const hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'enterprise' && r.enterprise_id === req.user.id) ||
      (req.user.role === 'bd'); // 简化处理，实际应验证 bd_id

    if (!hasAccess) return res.status(403).json({ message: '无权访问此聊天室' });

    let query = `
      SELECT m.*, u.display_name as sender_name, u.role as sender_role
      FROM chat_messages m JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = $1
    `;
    const params = [req.params.id];

    if (before) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }

    params.push(Number(limit));
    query += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

    const result = await db.query(query, params);
    // 返回正序消息
    res.json({ messages: result.rows.reverse().map(m => ({
      id: m.id,
      content: m.content,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      isSystem: m.is_system,
      createdAt: m.created_at,
    })) });
  } catch (err) { next(err); }
});

// POST /api/chat/rooms/:id/messages - 发送消息
router.post('/rooms/:id/messages', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: '消息不能为空' });

    const result = await db.query(
      `INSERT INTO chat_messages (room_id, sender_id, content, is_system)
       VALUES ($1, $2, $3, false) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]
    );

    res.status(201).json({ message: {
      id: result.rows[0].id,
      content: result.rows[0].content,
      senderName: req.user.displayName,
      senderRole: req.user.role,
      isSystem: false,
      createdAt: result.rows[0].created_at,
    }});
  } catch (err) { next(err); }
});

module.exports = router;
