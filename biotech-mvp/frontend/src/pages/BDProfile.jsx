import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bdApi } from '../services/api';
import CreditScoreBadge from '../components/CreditScoreBadge';

export default function BDProfile() {
  const { id } = useParams();
  const [bd, setBD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bdApi.get(id).then(r => setBD(r.data.bd)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!bd) return <div className="text-center py-20 text-gray-500">BD不存在</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/enterprise/bds" className="text-gray-400 hover:text-gray-600">← 返回BD列表</Link>
      </div>

      {/* 虚拟身份顶部横幅 */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center text-3xl font-black shadow">
              {bd.codeName?.[0] || 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{bd.codeName}</h1>
                <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">虚拟身份</span>
              </div>
              <p className="text-gray-300 text-sm">{bd.yearsExperience} 年行业经验 · 平台认证BD</p>
            </div>
          </div>
          <CreditScoreBadge score={bd.creditScore} />
        </div>

        {/* 量化指标 */}
        <div className="grid grid-cols-3 gap-4 mt-5 bg-white bg-opacity-10 rounded-xl p-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{bd.patentCount || 0}</p>
            <p className="text-xs text-gray-300">发明专利</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{bd.paperCount || 0}</p>
            <p className="text-xs text-gray-300">发表论文</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{bd.successCases || 0}</p>
            <p className="text-xs text-gray-300">成功案例</p>
          </div>
        </div>
      </div>

      {/* 匿名保护提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-xl mt-0.5">🔒</span>
        <div>
          <p className="text-sm font-medium text-amber-800">真实身份受平台保护</p>
          <p className="text-xs text-amber-600 mt-0.5">
            该BD以虚拟代号在平台展示。真实姓名、联系方式等身份信息由平台托管，
            仅在双方同意撮合、平台确认后方可解锁。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* 专业领域 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">专业领域</h2>
          <div className="flex flex-wrap gap-2">
            {(bd.expertiseTags || []).map(tag => (
              <span key={tag} className="bg-green-50 text-green-700 border border-green-200 text-sm px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 职业简介 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">职业简介</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {bd.summary || <span className="text-gray-400 italic">未提供</span>}
          </p>
        </div>

        {/* 主要成就（可能含部分遮蔽） */}
        {bd.achievements && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">主要成就</h2>
              {bd._isAnonymized && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span>🔒</span> 部分内容已脱敏
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {bd.achievements}
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Link
            to={`/ai-report/${bd.id}`}
            className="flex-1 text-center bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700"
          >
            查看AI背调报告
          </Link>
        </div>
      </div>
    </div>
  );
}
