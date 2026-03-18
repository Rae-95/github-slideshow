const express = require('express');
const { db } = require('../services/db');
const { requireRole } = require('../middleware/auth');
const { maskProject } = require('../middleware/privacy');

const router = express.Router();

// GET /api/projects - 获取项目列表
router.get('/', async (req, res, next) => {
  try {
    const { type, status = 'open', limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT p.*, u.display_name as enterprise_name,
        COUNT(DISTINCT pi.bd_id) as match_count
      FROM projects p
      JOIN users u ON p.enterprise_id = u.id
      LEFT JOIN project_invitations pi ON pi.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // 企业只看自己的项目
    if (req.user.role === 'enterprise') {
      params.push(req.user.id);
      query += ` AND p.enterprise_id = $${params.length}`;
    } else if (req.user.role === 'bd') {
      // BD只看开放中的项目
      query += ` AND p.status = 'open'`;
    }

    if (type) {
      params.push(type);
      query += ` AND p.type = $${params.length}`;
    }
    if (status && req.user.role !== 'bd') {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    query += ` GROUP BY p.id, u.display_name ORDER BY p.created_at DESC`;
    params.push(Number(limit), Number(offset));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);
    const isOwner = (p) => req.user.role === 'enterprise' && p.enterprise_id === req.user.id;
    res.json({
      projects: result.rows.map(row => {
        const p = formatProject(row);
        return maskProject(p, req.user.role, isOwner(row));
      })
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id - 获取项目详情
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.display_name as enterprise_name
       FROM projects p JOIN users u ON p.enterprise_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: '项目不存在' });
    const isOwner = req.user.role === 'enterprise' && result.rows[0].enterprise_id === req.user.id;
    res.json({ project: maskProject(formatProject(result.rows[0]), req.user.role, isOwner) });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects - 发布项目（企业端）
router.post('/', requireRole('enterprise'), async (req, res, next) => {
  try {
    const { title, type, description, requirements, budget, duration, tags } = req.body;
    if (!title || !type || !description) {
      return res.status(400).json({ message: '标题、类型和描述为必填项' });
    }

    const result = await db.query(
      `INSERT INTO projects (enterprise_id, title, type, description, requirements, budget, duration, tags, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING *`,
      [req.user.id, title, type, description, requirements, budget, duration, JSON.stringify(tags || [])]
    );
    res.status(201).json({ project: formatProject(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id - 更新项目
router.put('/:id', requireRole('enterprise'), async (req, res, next) => {
  try {
    const { title, description, requirements, budget, duration, tags, status } = req.body;

    // 确认是自己的项目
    const check = await db.query('SELECT id FROM projects WHERE id = $1 AND enterprise_id = $2', [req.params.id, req.user.id]);
    if (!check.rows[0]) return res.status(404).json({ message: '项目不存在或无权限' });

    const result = await db.query(
      `UPDATE projects SET title=$1, description=$2, requirements=$3, budget=$4, duration=$5,
       tags=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [title, description, requirements, budget, duration, JSON.stringify(tags || []), status, req.params.id]
    );
    res.json({ project: formatProject(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/invite/:bdId - 邀请BD
router.post('/:id/invite/:bdId', requireRole('enterprise'), async (req, res, next) => {
  try {
    const { id: projectId, bdId } = req.params;

    // 确认是自己的项目
    const project = await db.query('SELECT id FROM projects WHERE id = $1 AND enterprise_id = $2', [projectId, req.user.id]);
    if (!project.rows[0]) return res.status(404).json({ message: '项目不存在或无权限' });

    // 检查是否已邀请
    const existing = await db.query(
      'SELECT id FROM project_invitations WHERE project_id = $1 AND bd_id = $2',
      [projectId, bdId]
    );
    if (existing.rows[0]) return res.status(409).json({ message: '已发送过邀请' });

    await db.query(
      `INSERT INTO project_invitations (project_id, enterprise_id, bd_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [projectId, req.user.id, bdId]
    );

    // 更新项目状态为撮合中
    await db.query("UPDATE projects SET status='matching' WHERE id=$1", [projectId]);

    res.status(201).json({ message: '邀请已发送' });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/matches - 获取匹配BD列表
router.get('/:id/matches', requireRole('enterprise', 'admin'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.email, pi.status as invitation_status, pi.id as invitation_id,
              ar.overall_score as ai_match_score
       FROM project_invitations pi
       JOIN bd_profiles b ON pi.bd_id = b.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN ai_reports ar ON ar.bd_id = b.id
       WHERE pi.project_id = $1
       ORDER BY ar.overall_score DESC NULLS LAST`,
      [req.params.id]
    );
    res.json({ matches: result.rows });
  } catch (err) {
    next(err);
  }
});

function formatProject(row) {
  return {
    id: row.id,
    enterpriseId: row.enterprise_id,   // 内部用于所有权判断，不对外输出
    title: row.title,
    type: row.type,
    description: row.description,
    requirements: row.requirements,
    budget: row.budget,
    duration: row.duration,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    status: row.status,
    enterpriseName: row.enterprise_name,
    matchCount: Number(row.match_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
