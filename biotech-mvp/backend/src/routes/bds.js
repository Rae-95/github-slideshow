const express = require('express');
const { db } = require('../services/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/bds - BD列表（企业/管理员可见）
router.get('/', requireRole('enterprise', 'admin'), async (req, res, next) => {
  try {
    const { expertise, minScore = 0, keyword, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT b.*, u.email
      FROM bd_profiles b JOIN users u ON b.user_id = u.id
      WHERE b.status = 'approved' AND b.credit_score >= $1
    `;
    const params = [Number(minScore)];

    if (expertise) {
      params.push(`%${expertise}%`);
      query += ` AND b.expertise_tags::text ILIKE $${params.length}`;
    }
    if (keyword) {
      params.push(`%${keyword}%`);
      query += ` AND (b.code_name ILIKE $${params.length} OR b.summary ILIKE $${params.length})`;
    }

    params.push(Number(limit), Number(offset));
    query += ` ORDER BY b.credit_score DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);
    res.json({ bds: result.rows.map(formatBD) });
  } catch (err) {
    next(err);
  }
});

// GET /api/bds/me 或 /api/bds/:id
router.get('/:id', async (req, res, next) => {
  try {
    const isMe = req.params.id === 'me';
    let query, params;

    if (isMe) {
      // BD只能看自己的完整资料
      query = 'SELECT b.*, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.user_id = $1';
      params = [req.user.id];
    } else {
      query = 'SELECT b.*, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.id = $1';
      params = [req.params.id];
    }

    const result = await db.query(query, params);
    if (!result.rows[0]) return res.status(404).json({ message: 'BD不存在' });

    const bd = result.rows[0];
    // 非管理员/本人不返回真实邮箱
    if (!isMe && req.user.role !== 'admin') {
      delete bd.email;
    }

    res.json({ bd: formatBD(bd) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bds/profile - 更新BD资料
router.put('/profile', requireRole('bd'), async (req, res, next) => {
  try {
    const {
      codeName, summary, expertiseTags, yearsExperience,
      patentCount, paperCount, successCases, achievements,
    } = req.body;

    const result = await db.query(
      `UPDATE bd_profiles SET
        code_name = COALESCE($1, code_name),
        summary = COALESCE($2, summary),
        expertise_tags = COALESCE($3, expertise_tags),
        years_experience = COALESCE($4, years_experience),
        patent_count = COALESCE($5, patent_count),
        paper_count = COALESCE($6, paper_count),
        success_cases = COALESCE($7, success_cases),
        achievements = COALESCE($8, achievements),
        updated_at = NOW()
       WHERE user_id = $9
       RETURNING *`,
      [
        codeName, summary,
        JSON.stringify(expertiseTags || []),
        yearsExperience, patentCount, paperCount,
        successCases, achievements,
        req.user.id,
      ]
    );
    res.json({ bd: formatBD(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/bds/invitations - BD查看邀请
router.get('/invitations', requireRole('bd'), async (req, res, next) => {
  try {
    const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
    if (!bdProfile.rows[0]) return res.status(404).json({ message: 'BD档案不存在' });
    const bdId = bdProfile.rows[0].id;

    const result = await db.query(
      `SELECT pi.*, p.title as project_title, p.description as project_description,
              p.type as project_type, p.budget, p.duration,
              u.display_name as enterprise_name, pi.chat_room_id
       FROM project_invitations pi
       JOIN projects p ON pi.project_id = p.id
       JOIN users u ON pi.enterprise_id = u.id
       WHERE pi.bd_id = $1
       ORDER BY pi.created_at DESC`,
      [bdId]
    );

    res.json({
      invitations: result.rows.map(row => ({
        id: row.id,
        status: row.status,
        chatRoomId: row.chat_room_id,
        createdAt: row.created_at,
        project: {
          title: row.project_title,
          description: row.project_description,
          type: row.project_type,
          budget: row.budget,
          duration: row.duration,
        },
        enterprise: { displayName: row.enterprise_name },
      }))
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bds/invitations/:id/accept - 接受邀请
router.post('/invitations/:id/accept', requireRole('bd'), async (req, res, next) => {
  try {
    const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
    const bdId = bdProfile.rows[0]?.id;

    const invitation = await db.query(
      'SELECT * FROM project_invitations WHERE id = $1 AND bd_id = $2',
      [req.params.id, bdId]
    );
    if (!invitation.rows[0]) return res.status(404).json({ message: '邀请不存在' });

    // 创建聊天室
    const chatRoom = await db.query(
      `INSERT INTO chat_rooms (project_id, enterprise_id, bd_id, type)
       VALUES ($1, $2, $3, 'match') RETURNING id`,
      [invitation.rows[0].project_id, invitation.rows[0].enterprise_id, bdId]
    );

    // 更新邀请状态
    await db.query(
      'UPDATE project_invitations SET status = $1, chat_room_id = $2 WHERE id = $3',
      ['accepted', chatRoom.rows[0].id, req.params.id]
    );

    res.json({ message: '已接受邀请', chatRoomId: chatRoom.rows[0].id });
  } catch (err) {
    next(err);
  }
});

// POST /api/bds/invitations/:id/decline - 拒绝邀请
router.post('/invitations/:id/decline', requireRole('bd'), async (req, res, next) => {
  try {
    const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
    const bdId = bdProfile.rows[0]?.id;

    await db.query(
      'UPDATE project_invitations SET status = $1 WHERE id = $2 AND bd_id = $3',
      ['declined', req.params.id, bdId]
    );
    res.json({ message: '已拒绝邀请' });
  } catch (err) {
    next(err);
  }
});

// GET /api/bds/credit-score - 信用评分详情
router.get('/credit-score', requireRole('bd'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.credit_score, b.success_cases, b.patent_count, b.paper_count,
              b.years_experience, cs.breakdown
       FROM bd_profiles b
       LEFT JOIN credit_score_details cs ON cs.bd_id = b.id
       WHERE b.user_id = $1`,
      [req.user.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ message: '档案不存在' });

    // 计算评分分项
    const breakdown = {
      successCases: { label: '成功案例', score: Math.min(row.success_cases * 5, 30), max: 30 },
      experience: { label: '行业经验', score: Math.min(row.years_experience * 3, 20), max: 20 },
      patents: { label: '专利成果', score: Math.min(row.patent_count * 2, 20), max: 20 },
      publications: { label: '论文发表', score: Math.min(row.paper_count * 1, 15), max: 15 },
      platform: { label: '平台行为', score: row.breakdown?.platform || 15, max: 15 },
    };

    res.json({ score: row.credit_score, breakdown });
  } catch (err) {
    next(err);
  }
});

function formatBD(row) {
  return {
    id: row.id,
    codeName: row.code_name,
    summary: row.summary,
    expertiseTags: typeof row.expertise_tags === 'string' ? JSON.parse(row.expertise_tags) : (row.expertise_tags || []),
    yearsExperience: row.years_experience,
    patentCount: row.patent_count,
    paperCount: row.paper_count,
    successCases: row.success_cases,
    achievements: row.achievements,
    creditScore: row.credit_score,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
