const express = require('express');
const { db } = require('../services/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));

// GET /api/admin/pending-bds
router.get('/pending-bds', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.email, u.created_at as registered_at
       FROM bd_profiles b JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.created_at ASC`
    );
    res.json({ bds: result.rows });
  } catch (err) { next(err); }
});

// POST /api/admin/approve-bd/:id
router.post('/approve-bd/:id', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE bd_profiles SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // 通知用户（实际项目中发送邮件）
    const bd = await db.query(
      'SELECT b.code_name, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [req.params.id]
    );
    console.log(`[审核通过] BD: ${bd.rows[0]?.code_name} (${bd.rows[0]?.email})`);

    res.json({ message: '审核通过' });
  } catch (err) { next(err); }
});

// POST /api/admin/reject-bd/:id
router.post('/reject-bd/:id', async (req, res, next) => {
  try {
    const { reason } = req.body;
    await db.query(
      `UPDATE bd_profiles SET status = 'rejected', reject_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason, req.params.id]
    );
    console.log(`[审核拒绝] BD ID: ${req.params.id}, 原因: ${reason}`);
    res.json({ message: '审核已拒绝' });
  } catch (err) { next(err); }
});

// GET /api/admin/pending-enterprises
router.get('/pending-enterprises', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT e.*, u.email, u.display_name
       FROM enterprises e JOIN users u ON e.user_id = u.id
       WHERE e.status = 'pending'
       ORDER BY e.created_at ASC`
    );
    res.json({ enterprises: result.rows });
  } catch (err) { next(err); }
});

// POST /api/admin/approve-enterprise/:id
router.post('/approve-enterprise/:id', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE enterprises SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: '企业审核通过' });
  } catch (err) { next(err); }
});

// GET /api/admin/match-queue - 撮合队列（BD接受邀请后进入人工审核）
router.get('/match-queue', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT pi.*, p.title as project_title, p.type as project_type,
              b.code_name as bd_code_name, b.credit_score,
              ue.display_name as enterprise_name,
              ar.overall_score as match_score
       FROM project_invitations pi
       JOIN projects p ON pi.project_id = p.id
       JOIN bd_profiles b ON pi.bd_id = b.id
       JOIN users ue ON pi.enterprise_id = ue.id
       LEFT JOIN ai_reports ar ON ar.bd_id = pi.bd_id
       WHERE pi.status = 'accepted'
       ORDER BY pi.updated_at DESC`
    );
    res.json({
      matches: result.rows.map(row => ({
        id: row.id,
        status: row.status,
        matchScore: row.match_score,
        project: { title: row.project_title, type: row.project_type },
        bd: { codeName: row.bd_code_name, creditScore: row.credit_score },
        enterprise: { displayName: row.enterprise_name },
      }))
    });
  } catch (err) { next(err); }
});

// POST /api/admin/match-queue/:id/:action - 处理撮合
router.post('/match-queue/:id/:action', async (req, res, next) => {
  try {
    const { id, action } = req.params;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '操作无效' });
    }

    const newStatus = action === 'approve' ? 'platform_approved' : 'platform_rejected';
    await db.query(
      'UPDATE project_invitations SET status = $1 WHERE id = $2',
      [newStatus, id]
    );

    if (action === 'approve') {
      // 建立正式聊天室并通知双方
      const inv = await db.query('SELECT * FROM project_invitations WHERE id = $1', [id]);
      const { project_id, enterprise_id, bd_id, chat_room_id } = inv.rows[0];

      // 如果还没有聊天室，创建一个
      if (!chat_room_id) {
        const chatRoom = await db.query(
          `INSERT INTO chat_rooms (project_id, enterprise_id, bd_id, type)
           VALUES ($1, $2, $3, 'official') RETURNING id`,
          [project_id, enterprise_id, bd_id]
        );
        await db.query(
          'UPDATE project_invitations SET chat_room_id = $1 WHERE id = $2',
          [chatRoom.rows[0].id, id]
        );
      }
      console.log(`[撮合成功] Invitation ID: ${id}`);
    }

    res.json({ message: action === 'approve' ? '撮合确认成功' : '撮合已拒绝' });
  } catch (err) { next(err); }
});

// PUT /api/admin/credit-score/:bdId - 更新信用评分
router.put('/credit-score/:bdId', async (req, res, next) => {
  try {
    const { score, reason } = req.body;
    if (score < 0 || score > 100) return res.status(400).json({ message: '评分需在0-100之间' });

    await db.query(
      'UPDATE bd_profiles SET credit_score = $1, updated_at = NOW() WHERE id = $2',
      [score, req.params.bdId]
    );

    // 记录评分历史
    await db.query(
      `INSERT INTO credit_score_history (bd_id, score, reason, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [req.params.bdId, score, reason, req.user.id]
    );

    res.json({ message: '信用评分已更新' });
  } catch (err) { next(err); }
});

module.exports = router;
