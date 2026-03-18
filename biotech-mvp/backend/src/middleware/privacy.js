/**
 * privacy.js — 数据匿名化 / 脱敏中间件
 *
 * 规则：
 *  BD身份
 *    enterprise 视角：仅见虚拟代号、能力标签、量化指标——不见真名/邮箱/联系方式
 *    bd 视角（自身）：完整资料
 *    admin  视角：完整资料（含真实邮箱）
 *
 *  项目信息
 *    enterprise 视角（本人）：完整
 *    bd 视角：企业名模糊化，预算/需求部分遮蔽
 *    admin 视角：完整
 */

// ── BD脱敏 ────────────────────────────────────────────────

/**
 * @param {object} bd  - 原始DB行（已经过formatBD）
 * @param {'enterprise'|'bd'|'admin'} viewerRole
 * @param {boolean} isSelf - BD本人查看
 */
function anonymizeBD(bd, viewerRole, isSelf = false) {
  if (viewerRole === 'admin' || isSelf) return bd; // 管理员/本人：完整数据

  // 企业侧：虚拟身份视角
  return {
    id: bd.id,
    codeName: bd.codeName,                       // 虚拟代号
    summary: maskText(bd.summary, 0.0),           // 简介完整展示（不含可识别信息）
    expertiseTags: bd.expertiseTags,
    yearsExperience: bd.yearsExperience,
    patentCount: bd.patentCount,
    paperCount: bd.paperCount,
    successCases: bd.successCases,
    creditScore: bd.creditScore,
    status: bd.status,
    // 以下字段明确屏蔽
    achievements: maskText(bd.achievements, 0.4), // 成就部分遮蔽（含具体机构名）
    email: undefined,
    realName: undefined,
    phone: undefined,
    linkedinUrl: undefined,
    userId: undefined,
    _isAnonymized: true,
  };
}

// ── 项目脱敏 ──────────────────────────────────────────────

/**
 * @param {object} project - 原始格式化项目对象
 * @param {'enterprise'|'bd'|'admin'} viewerRole
 * @param {boolean} isOwner - 是否为发布方企业
 */
function maskProject(project, viewerRole, isOwner = false) {
  if (viewerRole === 'admin' || isOwner) return { ...project, _masked: false };

  // BD 视角：模糊化企业身份 + 敏感字段
  if (viewerRole === 'bd') {
    return {
      ...project,
      // 企业名替换为行业描述性代称
      enterpriseName: maskCompanyName(project.enterpriseName),
      // 预算模糊化：仅展示区间范围级别
      budget: maskBudget(project.budget),
      // 详细需求保留技能要求，遮蔽联系方式/内部代号
      requirements: maskRequirements(project.requirements),
      // 以下绝对屏蔽
      enterpriseId: undefined,
      contactEmail: undefined,
      internalCode: undefined,
      _masked: true,
    };
  }

  return project;
}

// ── 文字脱敏工具函数 ──────────────────────────────────────

/**
 * 对文本末尾 ratio 比例用 ● 替换（保留开头语义）
 * maskText('主导3个抗体IND申报项目，合作方包括某知名药企', 0.4)
 * → '主导3个抗体IND申报项目，合作方包括●●●●●'
 */
function maskText(text, ratio = 0.3) {
  if (!text) return text;
  const visibleLen = Math.ceil(text.length * (1 - ratio));
  return text.slice(0, visibleLen) + '●'.repeat(text.length - visibleLen);
}

/**
 * 模糊企业名：保留行业属性，去除可识别部分
 * '华康生物科技有限公司' → '某生物科技企业'
 * '博远医药集团股份有限公司' → '某医药集团'
 */
function maskCompanyName(name) {
  if (!name) return '某生物医药企业';
  const industryKeywords = ['生物科技', '医药', 'CDMO', '制药', 'CRO', '基因', '细胞', '医疗'];
  for (const kw of industryKeywords) {
    if (name.includes(kw)) return `某${kw}企业`;
  }
  return '某生物医药企业';
}

/**
 * 预算模糊化：将具体金额转为区间级别
 * '300-500万RMB' → '中等规模预算（百万级）'
 * '800-1200万RMB' → '较大规模预算（千万级）'
 */
function maskBudget(budget) {
  if (!budget || budget === '面议') return '面议（撮合后透露）';
  const num = parseFloat(budget.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '面议（撮合后透露）';
  if (num < 50)   return '小型预算（10万级）';
  if (num < 200)  return '中小型预算（百万以内）';
  if (num < 800)  return '中等预算（百万级）';
  if (num < 3000) return '较大预算（千万级）';
  return '大型预算（千万以上）';
}

/**
 * 需求文字脱敏：去除企业内部联系方式、内部项目代号
 * 保留技能/能力要求文字
 */
function maskRequirements(req) {
  if (!req) return req;
  return req
    .replace(/\b1[3-9]\d{9}\b/g, '●●●●（联系方式撮合后提供）')  // 手机号
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '●●●（邮箱撮合后提供）') // 邮箱
    .replace(/项目编号[：:]\s*\S+/g, '项目编号：●●●（内部代号）')
    .replace(/合同编号[：:]\s*\S+/g, '');
}

module.exports = { anonymizeBD, maskProject, maskText, maskBudget, maskCompanyName };
