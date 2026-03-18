import React from 'react';

const getScoreConfig = (score) => {
  if (score >= 90) return { label: 'AAA', color: 'bg-green-100 text-green-800 border-green-300', desc: '极优' };
  if (score >= 80) return { label: 'AA', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: '优秀' };
  if (score >= 70) return { label: 'A', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', desc: '良好' };
  if (score >= 60) return { label: 'BBB', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: '一般' };
  return { label: 'BB', color: 'bg-red-100 text-red-800 border-red-300', desc: '待提升' };
};

export default function CreditScoreBadge({ score }) {
  const config = getScoreConfig(score);
  return (
    <div className={`inline-flex items-center space-x-1 border px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span>信用</span>
      <span className="font-bold">{config.label}</span>
      <span>{score}</span>
      <span className="text-opacity-70">({config.desc})</span>
    </div>
  );
}
