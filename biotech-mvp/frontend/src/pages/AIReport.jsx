import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aiApi, bdApi } from '../services/api';
import CreditScoreBadge from '../components/CreditScoreBadge';

export default function AIReport() {
  const { bdId } = useParams();
  const [report, setReport] = useState(null);
  const [bd, setBD] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bdApi.get(bdId).then(r => setBD(r.data.bd)),
      aiApi.getReport(bdId).then(r => setReport(r.data.report)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [bdId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await aiApi.generateReport(bdId);
      setReport(res.data.report);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/bd-profile/${bdId}`} className="text-gray-400 hover:text-gray-600">← 返回</Link>
        <h1 className="text-2xl font-bold text-gray-900">AI背调报告</h1>
        {report && <span className="text-xs text-gray-400">生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')}</span>}
      </div>

      {/* BD基本信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {bd?.codeName?.[0] || 'B'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{bd?.codeName}</p>
              <p className="text-xs text-gray-400">{bd?.yearsExperience}年行业经验</p>
            </div>
          </div>
          <CreditScoreBadge score={bd?.creditScore || 0} />
        </div>
      </div>

      {!report ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">尚未生成AI背调报告</h3>
          <p className="text-sm text-gray-400 mb-6">基于BD提交的资料，AI将分析其科研能力、专利、论文和行业信用</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? '生成中（约30秒）...' : '生成AI背调报告'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 综合评分 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">综合评估</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report.scores || {}).map(([key, val]) => (
                <div key={key} className="text-center bg-white bg-opacity-15 rounded-xl p-3">
                  <p className="text-2xl font-bold">{val.score}</p>
                  <p className="text-xs text-blue-100">{val.label}</p>
                  <div className="mt-1 bg-white bg-opacity-20 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: `${val.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 科研能力分析 */}
          <ReportSection
            title="科研能力分析"
            icon="🔬"
            content={report.sections?.research}
          />

          {/* 专利分析 */}
          <ReportSection
            title="专利分析"
            icon="📋"
            content={report.sections?.patents}
          />

          {/* 论文发表分析 */}
          <ReportSection
            title="论文发表分析"
            icon="📄"
            content={report.sections?.publications}
          />

          {/* 行业信用评估 */}
          <ReportSection
            title="行业信用评估"
            icon="⭐"
            content={report.sections?.credit}
          />

          {/* AI风险提示 */}
          {report.riskFlags?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <span>⚠️</span> 风险提示
              </h3>
              <ul className="space-y-1">
                {report.riskFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI说明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400">
              本报告由AI基于BD提供的资料自动生成，仅供参考。平台已对BD资料进行基础审核，
              但无法验证所有信息的真实性。建议在正式合作前进行充分的尽职调查。
              报告生成模型：Claude API · 生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
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

function ReportSection({ title, icon, content }) {
  if (!content) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h3>
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</div>
    </div>
  );
}
