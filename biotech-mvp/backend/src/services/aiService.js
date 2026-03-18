/**
 * AI背调服务 - 调用 Claude API 生成背调报告和匹配评分
 *
 * 依赖：@anthropic-ai/sdk
 * 安装：npm install @anthropic-ai/sdk
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── BD背调报告生成 ────────────────────────────────────────
async function generateBackgroundReport(bd) {
  const expertise = Array.isArray(bd.expertise_tags)
    ? bd.expertise_tags.join('、')
    : (bd.expertise_tags ? JSON.parse(bd.expertise_tags).join('、') : '未填写');

  const systemPrompt = `你是一名专业的生物医药行业人才评估专家，擅长评估BD（商务拓展）人才的专业能力、
科研背景和行业信誉。你需要基于提供的信息，生成客观、专业、结构化的背景调查报告。

评估原则：
1. 客观公正，不夸大也不贬低
2. 基于行业标准进行横向比较
3. 明确指出信息不足或存疑之处
4. 给出具体可行的风险提示
5. 用中文输出，专业术语准确`;

  const userPrompt = `请基于以下BD信息，生成完整的背景调查报告：

## BD基本信息
- 代号：${bd.code_name}
- 行业经验：${bd.years_experience || 0} 年
- 专业领域：${expertise}
- 专利数量：${bd.patent_count || 0} 项
- 发表论文：${bd.paper_count || 0} 篇
- 成功撮合案例：${bd.success_cases || 0} 个

## 职业简介
${bd.summary || '未提供'}

## 主要成就
${bd.achievements || '未提供'}

---
请按以下JSON格式输出报告（不要包含markdown代码块标记）：
{
  "overallScore": <综合评分，0-100的整数>,
  "creditScore": <信用评分，0-100的整数，综合考量各维度>,
  "scores": {
    "research": {"label": "科研能力", "score": <0-100整数>},
    "patents": {"label": "专利成果", "score": <0-100整数>},
    "publications": {"label": "论文发表", "score": <0-100整数>},
    "industry": {"label": "行业经验", "score": <0-100整数>},
    "credit": {"label": "信用评级", "score": <0-100整数>}
  },
  "sections": {
    "research": "<科研能力分析，3-5句话，包含优势和不足>",
    "patents": "<专利分析，2-3句话，评估专利价值和转化潜力>",
    "publications": "<论文发表分析，2-3句话，评估学术影响力>",
    "credit": "<行业信用评估，3-4句话，综合评价职业声誉和合规性>"
  },
  "riskFlags": [
    "<风险提示1（如有）>",
    "<风险提示2（如有）>"
  ],
  "summary": "<200字以内的综合评价>"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const content = response.content[0].text.trim();

    // 解析JSON响应
    const parsed = JSON.parse(content);

    return {
      overallScore: parsed.overallScore,
      creditScore: parsed.creditScore,
      scores: parsed.scores,
      sections: parsed.sections,
      riskFlags: parsed.riskFlags || [],
      summary: parsed.summary,
    };
  } catch (error) {
    console.error('[AI] 报告生成失败:', error.message);

    // 降级方案：基于规则生成基础报告
    return generateFallbackReport(bd);
  }
}

// ── 项目-BD匹配评分 ───────────────────────────────────────
async function calculateMatchScore(project, bd) {
  const expertise = Array.isArray(bd.expertise_tags)
    ? bd.expertise_tags.join('、')
    : (bd.expertise_tags ? JSON.parse(bd.expertise_tags).join('、') : '');

  const tags = Array.isArray(project.tags)
    ? project.tags.join('、')
    : (project.tags ? JSON.parse(project.tags).join('、') : '');

  const prompt = `你是生物医药撮合平台的AI匹配引擎。请评估以下项目与BD的匹配程度：

## 项目信息
- 类型：${project.type}
- 标题：${project.title}
- 描述：${project.description}
- 要求：${project.requirements || '无特殊要求'}
- 标签：${tags}

## BD资料
- 专业领域：${expertise}
- 行业经验：${bd.years_experience || 0} 年
- 专利数：${bd.patent_count || 0}
- 论文数：${bd.paper_count || 0}
- 成功案例：${bd.success_cases || 0}
- 简介：${bd.summary || '未提供'}

请只输出一个0-100之间的整数匹配分数，不要任何解释。`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    });

    const score = parseInt(response.content[0].text.trim(), 10);
    return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error('[AI] 匹配评分失败:', error.message);
    return calculateRuleBasedScore(project, bd);
  }
}

// ── 批量为项目计算BD匹配排名 ──────────────────────────────
async function rankBDsForProject(project, bds) {
  const expertise = Array.isArray(project.tags)
    ? project.tags.join('、')
    : (project.tags ? JSON.parse(project.tags).join('、') : '');

  const bdList = bds.map((bd, idx) => {
    const tags = Array.isArray(bd.expertise_tags)
      ? bd.expertise_tags.join('、')
      : (bd.expertise_tags ? JSON.parse(bd.expertise_tags).join('、') : '');
    return `BD${idx + 1}（id:${bd.id}）: 领域=${tags}, 经验=${bd.years_experience}年, 信用=${bd.credit_score}`;
  }).join('\n');

  const prompt = `项目类型：${project.type}，需求：${project.description}，关键词：${expertise}

候选BD列表：
${bdList}

请输出每个BD的匹配分数，格式为JSON数组：[{"id": "BD的id", "score": 匹配分}]，只输出JSON，不要其他内容。`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const scores = JSON.parse(response.content[0].text.trim());
    return scores;
  } catch {
    return bds.map(bd => ({ id: bd.id, score: calculateRuleBasedScore(project, bd) }));
  }
}

// ── 降级：基于规则的报告生成 ──────────────────────────────
function generateFallbackReport(bd) {
  const expScore = Math.min((bd.years_experience || 0) * 5, 40);
  const patentScore = Math.min((bd.patent_count || 0) * 8, 30);
  const paperScore = Math.min((bd.paper_count || 0) * 5, 25);
  const caseScore = Math.min((bd.success_cases || 0) * 10, 40);

  const overallScore = Math.round((expScore + patentScore + paperScore + caseScore) / 4 + 40);
  const creditScore = Math.min(overallScore + 5, 100);

  return {
    overallScore: Math.min(overallScore, 100),
    creditScore: Math.min(creditScore, 100),
    scores: {
      research: { label: '科研能力', score: Math.min(patentScore + paperScore, 100) },
      patents: { label: '专利成果', score: Math.min(patentScore * 2, 100) },
      publications: { label: '论文发表', score: Math.min(paperScore * 3, 100) },
      industry: { label: '行业经验', score: Math.min(expScore * 2, 100) },
      credit: { label: '信用评级', score: creditScore },
    },
    sections: {
      research: `该BD具有${bd.years_experience || 0}年行业经验，拥有${bd.patent_count || 0}项专利和${bd.paper_count || 0}篇发表论文，科研积累${bd.patent_count > 5 ? '较为丰富' : '有待加强'}。`,
      patents: `共申请/获得${bd.patent_count || 0}项专利，${bd.patent_count > 3 ? '专利数量可观，具备较强技术创新能力' : '专利数量有限，建议关注技术积累深度'}。`,
      publications: `发表论文${bd.paper_count || 0}篇，${bd.paper_count > 5 ? '学术产出较好，具有一定学术影响力' : '学术发表有限，主要能力或在工业实践而非学术研究'}。`,
      credit: `基于平台规则评估信用等级，综合评分${creditScore}分。成功撮合案例${bd.success_cases || 0}个，${bd.success_cases > 3 ? '有良好的撮合业绩记录' : '撮合经验尚浅'}。建议正式合作前进行充分的背景核验。`,
    },
    riskFlags: [
      ...(bd.years_experience < 3 ? ['行业经验相对较短（<3年），建议考察具体项目经历'] : []),
      ...(!bd.summary ? ['未提供职业简介，建议要求补充完善资料'] : []),
      ...(bd.success_cases === 0 ? ['暂无平台内成功撮合记录，建议谨慎评估'] : []),
    ],
    summary: `该BD在${Array.isArray(bd.expertise_tags) ? bd.expertise_tags.join('、') : '相关领域'}具有${bd.years_experience || 0}年从业经验，总体评分${overallScore}分（满分100分）。AI降级模式生成，建议结合人工审核使用。`,
  };
}

// ── 基于规则的匹配评分（AI不可用时） ─────────────────────
function calculateRuleBasedScore(project, bd) {
  let score = 50; // 基础分

  const projectTags = Array.isArray(project.tags) ? project.tags : JSON.parse(project.tags || '[]');
  const bdTags = Array.isArray(bd.expertise_tags) ? bd.expertise_tags : JSON.parse(bd.expertise_tags || '[]');

  // 标签匹配
  const overlap = projectTags.filter(t =>
    bdTags.some(bt => bt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(bt.toLowerCase()))
  );
  score += overlap.length * 5;

  // 项目类型-BD专长匹配
  const typeTagMap = {
    cdmo: ['CDMO', '工艺开发', '原料药', '制剂'],
    clinical: ['临床', 'CRO', 'GCP', '临床研究'],
    research: ['科研', '研发', '生物技术', '基础研究'],
    regulatory: ['注册', '法规', 'IND', 'NDA', 'MAH'],
  };
  if (typeTagMap[project.type]) {
    const typeMatch = typeTagMap[project.type].some(t => bdTags.some(bt => bt.includes(t)));
    if (typeMatch) score += 15;
  }

  // 经验加分
  score += Math.min((bd.years_experience || 0) * 1.5, 15);

  // 信用分加成
  score += (bd.credit_score || 60) * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { generateBackgroundReport, calculateMatchScore, rankBDsForProject };
