/**
 * aiService.js — Claude API 调用层
 *
 * 功能：
 *   1. generateBackgroundReport(bd)   → 生成结构化AI背调报告
 *   2. calculateMatchScore(project, bd) → 单对项目-BD匹配评分
 *   3. rankBDsForProject(project, bds)  → 批量BD排名
 *
 * 模型选择：
 *   - 背调报告：claude-opus-4-6   (高质量推理)
 *   - 匹配评分：claude-haiku-4-5-20251001  (低延迟、低成本)
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ════════════════════════════════════════════════════════════
// 1. BD背调报告生成
// ════════════════════════════════════════════════════════════

async function generateBackgroundReport(bd) {
  const expertise = parseTagsToString(bd.expertise_tags);

  const systemPrompt = `你是「BioLink」生物医药撮合平台的专业背景调查引擎。
你的任务是对生物医药行业BD（商务拓展）人才进行全面、客观、结构化的背景评估。

## 你的专业背景
- 深度熟悉中国及全球生物医药行业生态（创新药、CDMO、CRO、临床研究、细胞基因治疗）
- 熟悉NMPA/FDA药品注册法规、MAH制度、GMP/GCP规范
- 具备科技成果评价、专利分析、学术论文影响力评估能力
- 了解行业信用评估体系和BD人才市场标准

## 评估原则
1. 基于BD提供的资料进行评估，**明确标注信息来源是"自述"而非第三方核验**
2. 评分必须有依据，不能无端拔高或压低
3. 风险提示必须具体、可操作，避免泛泛而谈
4. 对信息不足的维度，明确说明"信息不足，无法准确评估"
5. 信用等级参照行业标准：90+为AAA，80-89为AA，70-79为A，60-69为BBB，<60为BB

## 输出要求
严格输出JSON，不要包含markdown代码块标记，确保JSON合法可解析。`;

  const userPrompt = `请对以下BD进行全面背景调查，生成结构化报告：

## BD基础信息（BD自述）
- 虚拟代号：${bd.code_name}
- 行业总经验：${bd.years_experience || 0} 年
- 专业领域标签：${expertise || '未填写'}
- 发明专利数量：${bd.patent_count || 0} 项
- 发表论文数量：${bd.paper_count || 0} 篇
- 平台成功撮合案例：${bd.success_cases || 0} 个

## 职业简介（BD自述）
${bd.summary || '（未提供）'}

## 主要成就与经历（BD自述）
${bd.achievements || '（未提供）'}

---

请严格按以下JSON结构输出完整报告：

{
  "overallScore": <综合评分 0-100，整数>,
  "creditScore": <信用评分 0-100，整数，独立维度，反映诚信度和可信赖程度>,
  "creditLevel": <"AAA"|"AA"|"A"|"BBB"|"BB"，与creditScore对应>,

  "scores": {
    "researchCapability": { "label": "科研能力", "score": <0-100>, "weight": 0.25 },
    "patentQuality":      { "label": "专利成果", "score": <0-100>, "weight": 0.20 },
    "publications":       { "label": "论文影响力", "score": <0-100>, "weight": 0.15 },
    "industryExperience": { "label": "行业经验", "score": <0-100>, "weight": 0.25 },
    "creditRating":       { "label": "信用评级", "score": <0-100>, "weight": 0.15 }
  },

  "sections": {
    "researchCapability": {
      "headline": "<一句话核心结论，20字以内>",
      "analysis": "<3-5句详细分析，包括优势和不足，需引用具体数据>",
      "benchmarkNote": "<与行业同类BD横向比较说明，1-2句>"
    },

    "patentAnalysis": {
      "headline": "<一句话结论>",
      "count": ${bd.patent_count || 0},
      "assessment": "<对专利数量和潜在价值的评估，2-3句，若未提供专利详情请注明>",
      "transferPotential": "<技术转化前景评估，1-2句>",
      "verificationStatus": "unverified"
    },

    "publicationAnalysis": {
      "headline": "<一句话结论>",
      "count": ${bd.paper_count || 0},
      "assessment": "<论文发表量和学术影响力评估，2-3句>",
      "fieldRelevance": "<与生物医药商业化领域的相关性，1-2句>",
      "verificationStatus": "unverified"
    },

    "industryExperience": {
      "headline": "<一句话结论>",
      "yearsTotal": ${bd.years_experience || 0},
      "analysis": "<行业经验深度和广度分析，3-4句，结合领域标签判断>",
      "keyCompetencies": ["<核心能力1>", "<核心能力2>", "<核心能力3>"],
      "gaps": ["<能力短板或信息缺口1>", "<能力短板或信息缺口2>"]
    },

    "creditRating": {
      "headline": "<一句话结论>",
      "level": "<AAA/AA/A/BBB/BB>",
      "score": <信用评分数值>,
      "analysis": "<信用评估分析，4-5句，包括平台记录、合规性、职业声誉>",
      "successCasesNote": "<${bd.success_cases || 0}个成功案例的意义说明>",
      "redFlags": ["<信用风险点1（如有）>"]
    }
  },

  "riskFlags": [
    {
      "level": "<high|medium|low>",
      "category": "<信息核验|能力匹配|合规风险|其他>",
      "description": "<具体风险描述，20-50字>",
      "suggestion": "<应对建议，10-30字>"
    }
  ],

  "strengths": ["<核心优势1>", "<核心优势2>", "<核心优势3>"],
  "weaknesses": ["<明显不足1>", "<明显不足2>"],

  "suitableProjectTypes": ["<最适合的项目类型1>", "<最适合的项目类型2>"],

  "verificationNote": "本报告基于BD自述信息生成，所有分析结论均标注为「自述待核验」。平台建议在正式合作前进行独立背景核查。",

  "summary": "<200字以内的综合评价，包括：总体定位、核心价值、主要风险提示、合作建议>"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0].text.trim();

    // 容错：有时模型会在JSON外包裹额外文字，提取第一个 {...}
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI响应中未找到合法JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    validateReport(parsed);

    console.log(`[AI] 背调报告生成成功，BD: ${bd.code_name}，综合评分: ${parsed.overallScore}`);
    return parsed;
  } catch (error) {
    console.error('[AI] 报告生成失败，启用规则降级:', error.message);
    return generateFallbackReport(bd);
  }
}

// ════════════════════════════════════════════════════════════
// 2. 项目-BD 匹配评分
// ════════════════════════════════════════════════════════════

async function calculateMatchScore(project, bd) {
  const bdTags  = parseTagsToString(bd.expertise_tags);
  const projTags = parseTagsToString(project.tags);

  const prompt = `你是BioLink平台的AI匹配引擎，负责评估生物医药项目与BD的匹配度。

## 项目需求
- 类型：${project.type}（research=科研合作, cdmo=CDMO服务, clinical=临床试验, procurement=采购）
- 标题：${project.title}
- 描述：${project.description}
- BD要求：${project.requirements || '无特殊要求'}
- 关键词标签：${projTags}

## 候选BD资料
- 专业领域：${bdTags}
- 行业经验：${bd.years_experience || 0} 年
- 发明专利：${bd.patent_count || 0} 项
- 发表论文：${bd.paper_count || 0} 篇
- 成功案例：${bd.success_cases || 0} 个
- 信用评分：${bd.credit_score || 60} 分
- 简介：${bd.summary || '未提供'}

## 匹配评分标准（满分100）
- 领域专长匹配度 40分：BD专业标签与项目类型/关键词的契合程度
- 实操经验充分性 25分：年限和成功案例对项目复杂度的支撑
- 能力深度匹配 20分：专利/论文证明的技术深度与项目需求的对应
- 信用可信度 15分：平台信用评分加权

请只输出一个整数（0-100），代表匹配分数，不要任何解释。`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{ role: 'user', content: prompt }],
    });
    const score = parseInt(response.content[0].text.trim(), 10);
    return isNaN(score) ? calculateRuleBasedScore(project, bd) : clamp(score, 0, 100);
  } catch (error) {
    console.error('[AI] 匹配评分失败:', error.message);
    return calculateRuleBasedScore(project, bd);
  }
}

// ════════════════════════════════════════════════════════════
// 3. 批量BD排名（haiku 低成本）
// ════════════════════════════════════════════════════════════

async function rankBDsForProject(project, bds) {
  if (!bds.length) return [];

  const projTags = parseTagsToString(project.tags);
  const bdList = bds.map((bd, i) => {
    const tags = parseTagsToString(bd.expertise_tags);
    return `[${i}] id=${bd.id} | 领域=${tags} | 经验=${bd.years_experience}年 | 信用=${bd.credit_score} | 案例=${bd.success_cases}`;
  }).join('\n');

  const prompt = `项目需求：类型=${project.type}，关键词=${projTags}
需求说明：${project.description}

候选BD列表（共${bds.length}人）：
${bdList}

请为每位BD给出0-100匹配分，只输出JSON数组：[{"id":"<bd.id>","score":<分数>}]，不含其他内容。`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('无法解析批量评分JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return bds.map(bd => ({ id: bd.id, score: calculateRuleBasedScore(project, bd) }));
  }
}

// ════════════════════════════════════════════════════════════
// 降级：基于规则生成报告（AI不可用时）
// ════════════════════════════════════════════════════════════

function generateFallbackReport(bd) {
  const exp    = bd.years_experience || 0;
  const patents = bd.patent_count || 0;
  const papers  = bd.paper_count  || 0;
  const cases   = bd.success_cases || 0;
  const tags    = parseTagsToString(bd.expertise_tags);

  // 分项评分
  const researchScore  = clamp(Math.round(patents * 8 + papers * 4 + (exp > 5 ? 20 : exp * 3)), 0, 100);
  const patentScore    = clamp(patents * 12, 0, 100);
  const paperScore     = clamp(papers  * 10, 0, 100);
  const expScore       = clamp(exp * 6 + (exp >= 10 ? 10 : 0), 0, 100);
  const creditScore    = clamp(60 + cases * 5 + (exp >= 5 ? 5 : 0), 0, 100);
  const overallScore   = clamp(Math.round(
    researchScore  * 0.25 +
    patentScore    * 0.20 +
    paperScore     * 0.15 +
    expScore       * 0.25 +
    creditScore    * 0.15
  ), 0, 100);

  const creditLevel = overallScore >= 90 ? 'AAA' : overallScore >= 80 ? 'AA'
    : overallScore >= 70 ? 'A' : overallScore >= 60 ? 'BBB' : 'BB';

  return {
    overallScore,
    creditScore,
    creditLevel,
    scores: {
      researchCapability: { label: '科研能力',   score: researchScore,  weight: 0.25 },
      patentQuality:      { label: '专利成果',   score: patentScore,    weight: 0.20 },
      publications:       { label: '论文影响力', score: paperScore,     weight: 0.15 },
      industryExperience: { label: '行业经验',   score: expScore,       weight: 0.25 },
      creditRating:       { label: '信用评级',   score: creditScore,    weight: 0.15 },
    },
    sections: {
      researchCapability: {
        headline: patents + papers > 10 ? '科研积累较为丰富' : '科研积累有待加强',
        analysis: `该BD拥有${patents}项专利和${papers}篇论文，行业经验${exp}年。科研产出${patents + papers > 8 ? '处于行业中上水平' : '相对有限，建议关注其实操能力'}。`,
        benchmarkNote: '（注：本项为规则引擎生成，未启用AI深度分析）',
      },
      patentAnalysis: {
        headline: patents > 5 ? '专利数量较多，技术积累有一定基础' : '专利数量有限',
        count: patents,
        assessment: `共申请/获得${patents}项专利。${patents > 3 ? '专利数量可观，具备一定技术创新能力，建议核验专利权属和实施状态。' : '专利数量偏少，技术积累深度有待进一步评估。'}`,
        transferPotential: patents > 0 ? '具有一定技术转化潜力，需了解专利详情后判断' : '暂无专利，转化价值待评估',
        verificationStatus: 'unverified',
      },
      publicationAnalysis: {
        headline: papers > 5 ? '具有一定学术影响力' : '学术发表数量有限',
        count: papers,
        assessment: `发表论文${papers}篇。${papers > 5 ? '学术产出较好，在相关领域有一定知名度。' : '学术发表较少，其价值可能更多体现在工业实践层面。'}`,
        fieldRelevance: `专注于${tags || '生物医药'}领域，学术研究与商业实践的结合度需进一步了解。`,
        verificationStatus: 'unverified',
      },
      industryExperience: {
        headline: exp >= 10 ? '资深行业从业者' : exp >= 5 ? '中级从业经验' : '初中级从业经验',
        yearsTotal: exp,
        analysis: `具有${exp}年行业经验，专注于${tags || '生物医药'}领域。${exp >= 10 ? '丰富的行业积累有助于复杂项目推进。' : '经验尚在积累中，适合相对明确的项目类型。'}`,
        keyCompetencies: (bd.expertise_tags || []).slice(0, 3).map(t => String(t)),
        gaps: [exp < 5 ? '行业经验相对较短，复杂项目把控能力待验证' : null, !bd.summary ? '未提供职业简介，经验细节不明' : null].filter(Boolean),
      },
      creditRating: {
        headline: `信用评级${creditLevel}，${creditScore >= 80 ? '信用良好' : '信用一般'}`,
        level: creditLevel,
        score: creditScore,
        analysis: `基于规则引擎评估，综合信用分${creditScore}分（${creditLevel}级）。成功案例${cases}个，${cases >= 3 ? '有一定业绩背书' : '案例记录较少，建议谨慎评估'}。平台尚未发现违约或投诉记录。`,
        successCasesNote: cases > 0 ? `${cases}个成功案例为该BD的能力提供了初步验证` : '暂无平台内成功撮合记录，风险相对较高',
        redFlags: cases === 0 ? ['无平台撮合记录，建议要求提供外部参考背书'] : [],
      },
    },
    riskFlags: [
      exp < 3 && { level: 'medium', category: '能力匹配', description: '行业经验不足3年，处理复杂项目的能力存在不确定性', suggestion: '要求提供具体项目案例和参考人联系方式' },
      !bd.summary && { level: 'low', category: '信息核验', description: '未提供职业简介，资料完整性不足', suggestion: '要求补充完整简介后再进入撮合流程' },
      cases === 0 && { level: 'medium', category: '信息核验', description: '无平台内成功撮合记录，历史表现无法评估', suggestion: '要求提供平台外合作案例及参考方联系方式' },
    ].filter(Boolean),
    strengths: [
      tags ? `专注${tags.split('、')[0]}等细分领域` : '有行业领域专注',
      patents > 0 ? `拥有${patents}项专利，具备技术创新背景` : null,
      cases > 0 ? `已完成${cases}个平台撮合案例` : null,
    ].filter(Boolean),
    weaknesses: [
      exp < 5 ? '从业年限相对较短' : null,
      papers < 3 && patents < 2 ? '学术和专利积累薄弱' : null,
    ].filter(Boolean),
    suitableProjectTypes: inferSuitableTypes(bd.expertise_tags),
    verificationNote: '本报告由规则引擎生成（AI服务暂不可用），评估精度低于AI报告，建议在AI服务恢复后重新生成。',
    summary: `该BD在${tags || '生物医药'}领域具有${exp}年经验，规则引擎综合评分${overallScore}分（${creditLevel}级）。拥有${patents}项专利和${papers}篇论文，完成${cases}个撮合案例。建议进一步核验自述信息，重新生成AI版报告以获得更精准评估。`,
    _isFallback: true,
  };
}

// ════════════════════════════════════════════════════════════
// 基于规则的匹配评分（AI不可用时）
// ════════════════════════════════════════════════════════════

function calculateRuleBasedScore(project, bd) {
  let score = 45;

  const projTags = parseTagsArray(project.tags);
  const bdTags   = parseTagsArray(bd.expertise_tags);

  // 标签重叠（最高 +25）
  const overlap = projTags.filter(pt =>
    bdTags.some(bt => bt.toLowerCase().includes(pt.toLowerCase()) || pt.toLowerCase().includes(bt.toLowerCase()))
  );
  score += Math.min(overlap.length * 6, 25);

  // 项目类型与BD标签匹配（+15）
  const typeMap = {
    cdmo:        ['CDMO', '工艺', '原料药', '制剂', 'GMP'],
    clinical:    ['临床', 'CRO', 'GCP', '临床研究', '中心'],
    research:    ['科研', '研发', '生物技术', '基础研究', '高校'],
    procurement: ['采购', '供应链', '器械', '耗材'],
  };
  if (typeMap[project.type]?.some(kw => bdTags.some(bt => bt.includes(kw)))) score += 15;

  // 经验加分（最高 +10）
  score += Math.min((bd.years_experience || 0) * 1, 10);

  // 信用加成（最高 +10）
  score += Math.round(((bd.credit_score || 60) - 60) / 4);

  return clamp(Math.round(score), 0, 100);
}

// ════════════════════════════════════════════════════════════
// 工具函数
// ════════════════════════════════════════════════════════════

function parseTagsArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function parseTagsToString(val) {
  return parseTagsArray(val).join('、');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function inferSuitableTypes(expertiseTags) {
  const tags = parseTagsArray(expertiseTags).join(' ');
  const types = [];
  if (/CDMO|工艺|制剂|原料药/.test(tags))       types.push('CDMO服务');
  if (/临床|CRO|GCP|医院/.test(tags))            types.push('临床试验');
  if (/科研|研发|高校|基础研究/.test(tags))       types.push('科研合作');
  if (/注册|法规|IND|NDA|MAH/.test(tags))         types.push('注册法规咨询');
  if (/采购|供应链/.test(tags))                   types.push('采购需求');
  return types.length > 0 ? types : ['综合合作'];
}

// 校验报告结构完整性
function validateReport(report) {
  const required = ['overallScore', 'creditScore', 'creditLevel', 'scores', 'sections', 'summary'];
  for (const key of required) {
    if (report[key] === undefined) throw new Error(`AI报告缺少必填字段: ${key}`);
  }
  if (report.overallScore < 0 || report.overallScore > 100) throw new Error('overallScore超出范围');
}

module.exports = { generateBackgroundReport, calculateMatchScore, rankBDsForProject };
