import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aiApi, bdApi } from '../services/api';
import CreditScoreBadge from '../components/CreditScoreBadge';

// ── 评分色块配置 ──────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 55) return 'bg-yellow-500';
  return 'bg-red-400';
}

function getRiskColor(level) {
  return level === 'high' ? 'bg-red-100 border-red-300 text-red-700'
       : level === 'medium' ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
       : 'bg-gray-100 border-gray-300 text-gray-600';
}

function getRiskIcon(level) {
  return level === 'high' ? '🔴' : level === 'medium' ? '🟡' : '🟢';
}

// ── 总览雷达卡 ────────────────────────────────────────────
function ScoreRadar({ scores, overallScore, creditLevel }) {
  const items = Object.values(scores || {});
  return (
    <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-blue-200 text-sm">AI综合评分</p>
          <p className="text-5xl font-black">{overallScore}</p>
          <p className="text-blue-200 text-xs mt-1">满分100分</p>
        </div>
        <div className="text-right">
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-1 ${
            creditLevel === 'AAA' ? 'bg-green-400 text-green-900' :
            creditLevel === 'AA'  ? 'bg-blue-300 text-blue-900' :
            creditLevel === 'A'   ? 'bg-indigo-300 text-indigo-900' :
            creditLevel === 'BBB' ? 'bg-yellow-300 text-yellow-900' :
            'bg-red-300 text-red-900'
          }`}>
            信用 {creditLevel}
          </div>
          <p className="text-blue-200 text-xs">行业信用等级</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-100">{item.label}</span>
              <span className="font-semibold">{item.score} <span className="text-blue-300 font-normal">/ 100</span></span>
            </div>
            <div className="h-1.5 bg-white bg-opacity-20 rounded-full">
              <div
                className="h-1.5 rounded-full bg-white transition-all duration-700"
                style={{ width: `${item.score}%`, opacity: 0.85 + item.score * 0.0015 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 优势/不足标签云 ───────────────────────────────────────
function TagCloud({ strengths = [], weaknesses = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">优势 & 不足</h3>
      <div className="space-y-3">
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-700 mb-1.5">核心优势</p>
            <div className="flex flex-wrap gap-2">
              {strengths.map((s, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-orange-600 mb-1.5">需关注</p>
            <div className="flex flex-wrap gap-2">
              {weaknesses.map((w, i) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
                  △ {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 适合项目类型 ──────────────────────────────────────────
function SuitableTypes({ types = [] }) {
  if (!types.length) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <p className="text-xs font-medium text-blue-700 mb-2">AI推荐适合的合作类型</p>
      <div className="flex flex-wrap gap-2">
        {types.map((t, i) => (
          <span key={i} className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 风险提示列表 ──────────────────────────────────────────
function RiskFlagList({ riskFlags = [] }) {
  if (!riskFlags.length) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <p className="text-sm text-green-700">未发现重大风险提示</p>
      </div>
    );
  }

  // 兼容字符串数组（降级报告）和对象数组（AI报告）
  const normalized = riskFlags.map(f =>
    typeof f === 'string' ? { level: 'medium', category: '提示', description: f, suggestion: '建议审慎核实' } : f
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>⚠️</span> 风险提示
      </h3>
      <div className="space-y-3">
        {normalized.map((flag, i) => (
          <div key={i} className={`border rounded-lg p-3 ${getRiskColor(flag.level)}`}>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{getRiskIcon(flag.level)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{flag.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    flag.level === 'high' ? 'bg-red-200 text-red-800' :
                    flag.level === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {flag.level === 'high' ? '高' : flag.level === 'medium' ? '中' : '低'}风险
                  </span>
                </div>
                <p className="text-sm">{flag.description}</p>
                {flag.suggestion && (
                  <p className="text-xs mt-1 opacity-75">建议：{flag.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 各维度详情块 ──────────────────────────────────────────
function SectionCard({ icon, title, score, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        {score !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${getScoreColor(score)}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-sm font-bold text-gray-700">{score}</span>
          </div>
        )}
      </div>
      <div className="p-5 space-y-3 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// ── 科研能力节 ────────────────────────────────────────────
function ResearchSection({ data, score }) {
  if (!data) return null;
  return (
    <SectionCard icon="🔬" title="科研能力分析" score={score}>
      {data.headline && <p className="font-medium text-gray-900 text-base">{data.headline}</p>}
      <p>{data.analysis}</p>
      {data.benchmarkNote && (
        <p className="text-xs text-gray-400 italic border-t pt-2">{data.benchmarkNote}</p>
      )}
    </SectionCard>
  );
}

// ── 专利分析节 ────────────────────────────────────────────
function PatentSection({ data, score }) {
  if (!data) return null;
  return (
    <SectionCard icon="📋" title="专利成果分析" score={score}>
      {data.headline && <p className="font-medium text-gray-900">{data.headline}</p>}
      <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2.5">
        <span className="text-2xl font-black text-blue-700">{data.count ?? '—'}</span>
        <span className="text-blue-600 text-sm">项 发明专利（BD自述）</span>
        {data.verificationStatus === 'unverified' && (
          <span className="ml-auto text-xs text-orange-500 border border-orange-300 px-1.5 py-0.5 rounded">待核验</span>
        )}
      </div>
      <p>{data.assessment}</p>
      {data.transferPotential && (
        <p className="text-gray-500 text-xs">转化前景：{data.transferPotential}</p>
      )}
    </SectionCard>
  );
}

// ── 论文分析节 ────────────────────────────────────────────
function PublicationSection({ data, score }) {
  if (!data) return null;
  return (
    <SectionCard icon="📄" title="论文发表分析" score={score}>
      {data.headline && <p className="font-medium text-gray-900">{data.headline}</p>}
      <div className="flex items-center gap-3 bg-purple-50 rounded-lg px-4 py-2.5">
        <span className="text-2xl font-black text-purple-700">{data.count ?? '—'}</span>
        <span className="text-purple-600 text-sm">篇 学术论文（BD自述）</span>
        {data.verificationStatus === 'unverified' && (
          <span className="ml-auto text-xs text-orange-500 border border-orange-300 px-1.5 py-0.5 rounded">待核验</span>
        )}
      </div>
      <p>{data.assessment}</p>
      {data.fieldRelevance && (
        <p className="text-gray-500 text-xs">领域相关性：{data.fieldRelevance}</p>
      )}
    </SectionCard>
  );
}

// ── 行业经验节 ────────────────────────────────────────────
function ExperienceSection({ data, score }) {
  if (!data) return null;
  return (
    <SectionCard icon="🏭" title="行业经验评估" score={score}>
      {data.headline && <p className="font-medium text-gray-900">{data.headline}</p>}
      <div className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-2.5">
        <span className="text-2xl font-black text-green-700">{data.yearsTotal ?? '—'}</span>
        <span className="text-green-600 text-sm">年 行业经验</span>
      </div>
      <p>{data.analysis}</p>
      {data.keyCompetencies?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">核心能力</p>
          <div className="flex flex-wrap gap-1.5">
            {data.keyCompetencies.map((c, i) => (
              <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      )}
      {data.gaps?.filter(Boolean).length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">待了解方面</p>
          <ul className="space-y-0.5">
            {data.gaps.filter(Boolean).map((g, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-1"><span>△</span>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

// ── 信用评级节 ────────────────────────────────────────────
function CreditSection({ data, score }) {
  if (!data) return null;
  const levelColor = {
    AAA: 'from-green-500 to-emerald-600',
    AA:  'from-blue-500 to-indigo-600',
    A:   'from-indigo-500 to-violet-600',
    BBB: 'from-yellow-500 to-orange-500',
    BB:  'from-red-500 to-rose-600',
  };

  return (
    <SectionCard icon="⭐" title="行业信用评估" score={score}>
      {data.headline && <p className="font-medium text-gray-900">{data.headline}</p>}

      <div className={`bg-gradient-to-r ${levelColor[data.level] || 'from-gray-500 to-gray-600'} rounded-xl p-4 text-white flex items-center justify-between`}>
        <div>
          <p className="text-3xl font-black">{data.level || '—'}</p>
          <p className="text-xs opacity-80">信用等级</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{data.score}</p>
          <p className="text-xs opacity-80">信用评分 / 100</p>
        </div>
      </div>

      <p>{data.analysis}</p>
      {data.successCasesNote && (
        <p className="text-gray-500 text-xs border-l-2 border-gray-300 pl-2">{data.successCasesNote}</p>
      )}
      {data.redFlags?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          {data.redFlags.map((f, i) => (
            <p key={i} className="text-xs text-red-700">⚠ {f}</p>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ════════════════════════════════════════════════════════════
// 主组件
// ════════════════════════════════════════════════════════════
export default function AIReport() {
  const { bdId } = useParams();
  const [report, setReport]     = useState(null);
  const [bd, setBD]             = useState(null);
  const [generating, setGen]    = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      bdApi.get(bdId).then(r => setBD(r.data.bd)),
      aiApi.getReport(bdId).then(r => setReport(r.data.report)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [bdId]);

  const handleGenerate = async () => {
    setGen(true);
    try {
      const res = await aiApi.generateReport(bdId);
      setReport(res.data.report);
    } catch (err) {
      alert(err.response?.data?.message || '生成失败，请重试');
    } finally {
      setGen(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  const s = report?.sections || {};
  const scores = report?.scores || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={`/bd-profile/${bdId}`} className="text-gray-400 hover:text-gray-600">← 返回</Link>
          <h1 className="text-2xl font-bold text-gray-900">AI背调报告</h1>
          {report?._isFallback && (
            <span className="text-xs bg-orange-100 text-orange-600 border border-orange-300 px-2 py-0.5 rounded-full">规则引擎生成</span>
          )}
        </div>
        {report && (
          <span className="text-xs text-gray-400">
            {new Date(report.generatedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      {/* BD身份卡（匿名） */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {bd?.codeName?.[0] || 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{bd?.codeName}</p>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">虚拟身份</span>
              </div>
              <p className="text-xs text-gray-400">{bd?.yearsExperience} 年行业经验 · 已平台认证</p>
            </div>
          </div>
          <CreditScoreBadge score={bd?.creditScore || 0} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(bd?.expertiseTags || []).map(t => (
            <span key={t} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">{t}</span>
          ))}
        </div>
      </div>

      {!report ? (
        /* ── 未生成状态 ── */
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">尚未生成AI背调报告</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            AI将基于该BD的科研经验、专利、论文和行业数据，生成多维度结构化背调报告，
            帮助您客观评估合作风险和匹配度。
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mb-8">
            {['🔬 科研能力评估', '📋 专利成果分析', '📄 论文影响力', '⭐ 信用评分'].map(item => (
              <span key={item} className="flex items-center gap-1">{item}</span>
            ))}
          </div>
          <button
            onClick={handleGenerate} disabled={generating}
            className="bg-blue-600 text-white px-10 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? '🤖 生成中（约30秒）...' : '生成AI背调报告'}
          </button>
        </div>
      ) : (
        /* ── 报告正文 ── */
        <div className="space-y-5">
          {/* 1. 综合评分雷达 */}
          <ScoreRadar
            scores={scores}
            overallScore={report.overallScore}
            creditLevel={report.creditLevel}
          />

          {/* 2. 综合摘要 */}
          {report.summary && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-2">综合评价摘要</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
            </div>
          )}

          {/* 3. 优势 & 不足 + 适合类型 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TagCloud strengths={report.strengths} weaknesses={report.weaknesses} />
            <div className="space-y-4">
              <SuitableTypes types={report.suitableProjectTypes} />
            </div>
          </div>

          {/* 4. 各维度详情 */}
          <ResearchSection
            data={s.researchCapability}
            score={scores.researchCapability?.score}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PatentSection    data={s.patentAnalysis}      score={scores.patentQuality?.score} />
            <PublicationSection data={s.publicationAnalysis} score={scores.publications?.score} />
          </div>
          <ExperienceSection data={s.industryExperience} score={scores.industryExperience?.score} />
          <CreditSection    data={s.creditRating}        score={scores.creditRating?.score} />

          {/* 5. 风险提示 */}
          <RiskFlagList riskFlags={report.riskFlags} />

          {/* 6. 免责声明 + 重新生成 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
            {report.verificationNote || '本报告由AI基于BD自述资料生成，所有信息标注为「待核验」。建议在正式合作前进行独立尽职调查。'}
            <br />
            生成模型：{report.modelUsed || 'claude-opus-4-6'} · 时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerate} disabled={generating}
              className="text-sm text-blue-600 border border-blue-300 px-6 py-2 rounded-lg hover:bg-blue-50"
            >
              {generating ? '重新生成中...' : '重新生成报告'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
