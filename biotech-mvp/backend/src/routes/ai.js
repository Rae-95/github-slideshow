const express = require('express');
const { db } = require('../services/db');
const { requireRole } = require('../middleware/auth');
const { generateBackgroundReport, calculateMatchScore } = require('../services/aiService');

const router = express.Router();

// POST /api/ai/report/:bdId - 生成AI背调报告
router.post('/report/:bdId', requireRole('enterprise', 'admin'), async (req, res, next) => {
  try {
    const { bdId } = req.params;

    // 获取BD资料
    const bdResult = await db.query(
      `SELECT b.*, u.email FROM bd_profiles b JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
      [bdId]
    );
    if (!bdResult.rows[0]) return res.status(404).json({ message: 'BD不存在' });

    const bd = bdResult.rows[0];

    // 调用AI服务生成报告
    console.log(`[AI] 开始生成背调报告，BD: ${bd.code_name}`);
    const report = await generateBackgroundReport(bd);

    // 存储/更新报告
    const existing = await db.query('SELECT id FROM ai_reports WHERE bd_id = $1', [bdId]);
    let savedReport;

    if (existing.rows[0]) {
      savedReport = await db.query(
        `UPDATE ai_reports SET
          overall_score = $1, sections = $2, scores = $3, risk_flags = $4,
          generated_at = NOW(), generated_by = $5
         WHERE bd_id = $6 RETURNING *`,
        [report.overallScore, JSON.stringify(report.sections), JSON.stringify(report.scores),
         JSON.stringify(report.riskFlags), req.user.id, bdId]
      );
    } else {
      savedReport = await db.query(
        `INSERT INTO ai_reports (bd_id, overall_score, sections, scores, risk_flags, generated_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [bdId, report.overallScore, JSON.stringify(report.sections), JSON.stringify(report.scores),
         JSON.stringify(report.riskFlags), req.user.id]
      );
    }

    // 同步更新BD信用评分
    await db.query(
      'UPDATE bd_profiles SET credit_score = $1 WHERE id = $2',
      [report.creditScore, bdId]
    );

    res.json({ report: formatReport(savedReport.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/report/:bdId - 获取已生成的报告
router.get('/report/:bdId', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM ai_reports WHERE bd_id = $1',
      [req.params.bdId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: '报告尚未生成' });
    res.json({ report: formatReport(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/match-score/:projectId/:bdId - 计算项目匹配分
router.get('/match-score/:projectId/:bdId', requireRole('enterprise', 'admin'), async (req, res, next) => {
  try {
    const [projectResult, bdResult] = await Promise.all([
      db.query('SELECT * FROM projects WHERE id = $1', [req.params.projectId]),
      db.query('SELECT * FROM bd_profiles WHERE id = $1', [req.params.bdId]),
    ]);

    if (!projectResult.rows[0]) return res.status(404).json({ message: '项目不存在' });
    if (!bdResult.rows[0]) return res.status(404).json({ message: 'BD不存在' });

    const score = await calculateMatchScore(projectResult.rows[0], bdResult.rows[0]);
    res.json({ matchScore: score });
  } catch (err) {
    next(err);
  }
});

function formatReport(row) {
  return {
    id: row.id,
    bdId: row.bd_id,
    overallScore: row.overall_score,
    sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    riskFlags: typeof row.risk_flags === 'string' ? JSON.parse(row.risk_flags) : row.risk_flags,
    generatedAt: row.generated_at,
  };
}

module.exports = router;
