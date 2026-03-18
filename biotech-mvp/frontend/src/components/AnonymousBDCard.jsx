/**
 * AnonymousBDCard — BD虚拟身份卡片
 *
 * 设计原则：
 *  - 对企业侧：展示能力标签、量化指标、信用评分——不暴露真实姓名/联系方式
 *  - 视觉上用"虚拟身份"标签明确提示匿名状态
 *  - 敏感成就文字（若API返回了部分遮蔽字符）在前端做进一步视觉处理
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CreditScoreBadge from './CreditScoreBadge';

// 将"●"字符渲染为模糊色块，提升视觉一致性
function MaskedText({ text }) {
  if (!text) return <span className="text-gray-400 text-xs italic">（未提供）</span>;

  const parts = text.split(/(●+)/);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('●') ? (
          <span
            key={i}
            className="inline-block bg-gray-300 rounded text-transparent select-none"
            style={{ minWidth: `${part.length * 0.6}em`, height: '0.85em', verticalAlign: 'text-bottom' }}
            title="已脱敏（撮合成功后解锁）"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// 信用等级颜色
const levelColors = {
  AAA: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  AA:  { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500'    },
  A:   { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300',  dot: 'bg-indigo-500'  },
  BBB: { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300',  dot: 'bg-yellow-500'  },
  BB:  { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300',     dot: 'bg-red-400'     },
};

function getCreditLevel(score) {
  if (score >= 90) return 'AAA';
  if (score >= 80) return 'AA';
  if (score >= 70) return 'A';
  if (score >= 60) return 'BBB';
  return 'BB';
}

// 生成BD头像颜色（基于代号，固定不变）
function getAvatarGradient(codeName = '') {
  const gradients = [
    'from-green-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-orange-400 to-red-500',
    'from-teal-400 to-cyan-500',
  ];
  const idx = codeName.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export default function AnonymousBDCard({ bd, onInvite, projectId }) {
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);

  const level = getCreditLevel(bd.creditScore || 0);
  const lc = levelColors[level] || levelColors.BB;
  const gradient = getAvatarGradient(bd.codeName);

  const handleInvite = async () => {
    if (!onInvite || invited) return;
    setInviting(true);
    try {
      await onInvite(projectId, bd.id);
      setInvited(true);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      {/* 顶部色带 */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-5">
        {/* 头部：头像 + 代号 + 认证状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
              {bd.codeName?.[0] || 'B'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{bd.codeName}</p>
                {/* 虚拟身份标识 */}
                <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full leading-none">
                  虚拟身份
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {bd.yearsExperience} 年经验 · 已平台认证
              </p>
            </div>
          </div>

          {/* 信用等级徽章 */}
          <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full ${lc.bg} ${lc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${lc.dot}`} />
            <span className={`text-xs font-bold ${lc.text}`}>{level}</span>
            <span className={`text-xs ${lc.text} opacity-70`}>{bd.creditScore}</span>
          </div>
        </div>

        {/* 专业标签 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(bd.expertiseTags || []).slice(0, 5).map(tag => (
            <span key={tag} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {(bd.expertiseTags || []).length > 5 && (
            <span className="text-xs text-gray-400">+{bd.expertiseTags.length - 5}</span>
          )}
        </div>

        {/* 职业简介（支持遮蔽字符渲染） */}
        <div className="text-sm text-gray-600 line-clamp-2 mb-4 min-h-[2.5rem]">
          <MaskedText text={bd.summary} />
        </div>

        {/* 量化指标 */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4 bg-gray-50 rounded-xl p-2.5">
          <Metric value={bd.patentCount || 0}   label="专利" icon="📋" />
          <Metric value={bd.paperCount || 0}    label="论文" icon="📄" />
          <Metric value={bd.successCases || 0}  label="案例" icon="✅" />
          <Metric value={`${bd.yearsExperience || 0}年`} label="经验" icon="🏭" />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Link
            to={`/bd-profile/${bd.id}`}
            className="flex-1 text-center text-sm bg-gray-50 text-gray-600 border border-gray-200 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            查看档案
          </Link>
          <Link
            to={`/ai-report/${bd.id}`}
            className="flex-1 text-center text-sm bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            AI背调
          </Link>
          {onInvite && (
            <button
              onClick={handleInvite}
              disabled={inviting || invited}
              className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                invited
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
              }`}
            >
              {invited ? '已邀请' : inviting ? '邀请中...' : '邀请合作'}
            </button>
          )}
        </div>
      </div>

      {/* 底部：匿名提示 */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span>🔒</span>
          <span>真实身份由平台托管，撮合成功后经双方同意后解锁</span>
        </p>
      </div>
    </div>
  );
}

function Metric({ value, label, icon }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
