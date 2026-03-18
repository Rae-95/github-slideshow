const express = require('express');
const { db } = require('../services/db');
const { requireRole } = require('../middleware/auth');
const { anonymizeBD } = require('../middleware/privacy');

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
    // 按调用者角色做匿名化处理
    const bds = result.rows.map(row => anonymizeBD(formatBD(row), req.user.role));
    res.json({ bds });
  } catch (err) {
    next(err);
  }
});

// ── 注意：精确路径必须在 /:id 之前注册 ───────────────────

// GET /api/bds/credit-score - 信用评分详情（BD本人）
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

    const breakdown = {
      successCases:  { label: '成功案例',  score: Math.min(row.success_cases  * 5, 30), max: 30 },
      experience:    { label: '行业经验',  score: Math.min(row.years_experience * 3, 20), max: 20 },
      patents:       { label: '专利成果',  score: Math.min(row.patent_count    * 2, 20), max: 20 },
      publications:  { label: '论文发表',  score: Math.min(row.paper_count     * 1, 15), max: 15 },
      platform:      { label: '平台行为',  score: row.breakdown?.platform || 15,          max: 15 },
    };

    res.json({ score: row.credit_score, breakdown });
  } catch (err) {
    next(err);
  }
});

// GET /api/bds/invitations - BD查看自己的项目邀请
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
          // BD收到邀请时项目预算同样脱敏
          budget: maskBudgetForBD(row.budget),
          duration: row.duration,
        },
        // 企业名在邀请阶段对BD匿名化——仅撮合成功后解锁
        enterprise: {
          displayName: row.status === 'platform_approved'
            ? row.enterprise_name
            : maskCompanyNameForBD(row.enterprise_name),
        },
      }))
    });
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
      query = 'SELECT b.*, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.user_id = $1';
      params = [req.user.id];
    } else {
      query = 'SELECT b.*, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.id = $1';
      params = [req.params.id];
    }

    const result = await db.query(query, params);
    if (!result.rows[0]) return res.status(404).json({ message: 'BD不存在' });

    const isSelf = isMe || (req.user.role === 'bd' && result.rows[0].user_id === req.user.id);
    const formatted = formatBD(result.rows[0]);
    const bd = anonymizeBD(formatted, req.user.role, isSelf);

    res.json({ bd });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bds/profile - 更新BD资料（BD本人）
router.put('/profile', requireRole('bd'), async (req, res, next) => {
  try {
    const {
      codeName, summary, expertiseTags, yearsExperience,
      patentCount, paperCount, successCases, achievements,
    } = req.body;

    // 校验虚拟代号不包含真实姓名/联系方式
    if (codeName && /1[3-9]\d{9}/.test(codeName)) {
      return res.status(400).json({ message: '虚拟代号不能包含手机号码' });
    }

    const result = await db.query(
      `UPDATE bd_profiles SET
        code_name        = COALESCE($1, code_name),
        summary          = COALESCE($2, summary),
        expertise_tags   = COALESCE($3, expertise_tags),
        years_experience = COALESCE($4, years_experience),
        patent_count     = COALESCE($5, patent_count),
        paper_count      = COALESCE($6, paper_count),
        success_cases    = COALESCE($7, success_cases),
        achievements     = COALESCE($8, achievements),
        updated_at       = NOW()
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
    // 本人更新——返回完整未脱敏数据
    res.json({ bd: formatBD(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/bds/invitations/:id/accept
router.post('/invitations/:id/accept', requireRole('bd'), async (req, res, next) => {
  try {
    const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
    const bdId = bdProfile.rows[0]?.id;

    const invitation = await db.query(
      'SELECT * FROM project_invitations WHERE id = $1 AND bd_id = $2',
      [req.params.id, bdId]
    );
    if (!invitation.rows[0]) return res.status(404).json({ message: '邀请不存在' });
    if (invitation.rows[0].status !== 'pending') {
      return res.status(409).json({ message: `邀请当前状态为 ${invitation.rows[0].status}，无法再次接受` });
    }

    const chatRoom = await db.query(
      `INSERT INTO chat_rooms (project_id, enterprise_id, bd_id, type)
       VALUES ($1, $2, $3, 'match') RETURNING id`,
      [invitation.rows[0].project_id, invitation.rows[0].enterprise_id, bdId]
    );

    await db.query(
      'UPDATE project_invitations SET status=$1, chat_room_id=$2 WHERE id=$3',
      ['accepted', chatRoom.rows[0].id, req.params.id]
    );

    res.json({ message: '已接受邀请，等待平台确认撮合', chatRoomId: chatRoom.rows[0].id });
  } catch (err) {
    next(err);
  }
});

// POST /api/bds/invitations/:id/decline
router.post('/invitations/:id/decline', requireRole('bd'), async (req, res, next) => {
  try {
    const bdProfile = await db.query('SELECT id FROM bd_profiles WHERE user_id = $1', [req.user.id]);
    const bdId = bdProfile.rows[0]?.id;

    await db.query(
      'UPDATE project_invitations SET status=$1 WHERE id=$2 AND bd_id=$3',
      ['declined', req.params.id, bdId]
    );
    res.json({ message: '已拒绝邀请' });
  } catch (err) {
    next(err);
  }
});

// ── 私有辅助函数 ──────────────────────────────────────────

function formatBD(row) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,                 // 仅管理员/本人视角才会保留
    codeName: row.code_name,
    summary: row.summary,
    expertiseTags: parseJSON(row.expertise_tags, []),
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

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// 邀请阶段企业名脱敏（BD视角）
function maskCompanyNameForBD(name) {
  if (!name) return '某生物医药企业';
  const keywords = ['生物科技', '医药', 'CDMO', '制药', 'CRO', '基因', '细胞', '医疗', '健康'];
  for (const kw of keywords) {
    if (name.includes(kw)) return `某${kw}企业`;
  }
  return '某生物医药企业';
}

// 邀请阶段预算脱敏（BD视角）
function maskBudgetForBD(budget) {
  if (!budget || budget === '面议') return '面议（成功撮合后透露）';
  const num = parseFloat(String(budget).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '面议（成功撮合后透露）';
  if (num < 50)   return '小型预算';
  if (num < 200)  return '中小型预算（百万以内）';
  if (num < 800)  return '中等预算（百万级）';
  if (num < 3000) return '较大预算（千万级）';
  return '大型预算（千万以上）';
}

module.exports = router;
