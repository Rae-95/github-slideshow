import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';

// ── 审核队列 ──────────────────────────────────────────────
function AuditQueue() {
  const [pendingBDs, setPendingBDs] = useState([]);
  const [pendingEnterprises, setPendingEnterprises] = useState([]);
  const [activeTab, setActiveTab] = useState('bds');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getPendingBDs().then(r => setPendingBDs(r.data.bds)),
      adminApi.getPendingEnterprises().then(r => setPendingEnterprises(r.data.enterprises)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleApproveBD = async (id) => {
    await adminApi.approveBD(id);
    setPendingBDs(prev => prev.filter(bd => bd.id !== id));
  };

  const handleRejectBD = async (id) => {
    const reason = window.prompt('拒绝原因（将通知BD）：');
    if (!reason) return;
    await adminApi.rejectBD(id, reason);
    setPendingBDs(prev => prev.filter(bd => bd.id !== id));
  };

  const handleApproveEnterprise = async (id) => {
    await adminApi.approveEnterprise(id);
    setPendingEnterprises(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">审核队列</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'bds' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'
          }`}
          onClick={() => setActiveTab('bds')}
        >
          BD审核 ({pendingBDs.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'enterprises' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'
          }`}
          onClick={() => setActiveTab('enterprises')}
        >
          企业审核 ({pendingEnterprises.length})
        </button>
      </div>

      {activeTab === 'bds' && (
        <div className="space-y-4">
          {pendingBDs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              暂无待审核BD
            </div>
          ) : pendingBDs.map(bd => (
            <div key={bd.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{bd.codeName}</h3>
                  <p className="text-xs text-gray-400">注册时间：{new Date(bd.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveBD(bd.id)}
                    className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleRejectBD(bd.id)}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-sm hover:bg-red-100"
                  >
                    拒绝
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{bd.summary}</p>

              <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                <div><span className="text-gray-500">经验：</span><span className="font-medium">{bd.yearsExperience}年</span></div>
                <div><span className="text-gray-500">专利：</span><span className="font-medium">{bd.patentCount}项</span></div>
                <div><span className="text-gray-500">论文：</span><span className="font-medium">{bd.paperCount}篇</span></div>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {(bd.expertiseTags || []).map(tag => (
                  <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Link to={`/ai-report/${bd.id}`} className="text-sm text-blue-600 hover:underline">
                  查看AI背调报告
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'enterprises' && (
        <div className="space-y-4">
          {pendingEnterprises.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              暂无待审核企业
            </div>
          ) : pendingEnterprises.map(ent => (
            <div key={ent.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{ent.companyName}</h3>
                  <p className="text-xs text-gray-400">统一社会信用代码：{ent.creditCode}</p>
                  <p className="text-sm text-gray-600 mt-2">{ent.description}</p>
                </div>
                <button
                  onClick={() => handleApproveEnterprise(ent.id)}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700"
                >
                  通过认证
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 撮合队列管理 ──────────────────────────────────────────
function MatchQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getMatchQueue().then(r => setQueue(r.data.matches)).finally(() => setLoading(false));
  }, []);

  const handleProcess = async (id, action) => {
    await adminApi.processMatch(id, action);
    setQueue(prev => prev.map(m => m.id === id ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' } : m));
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">撮合管理</h1>

      <div className="space-y-4">
        {queue.map(match => (
          <div key={match.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">企业方</p>
                  <p className="font-medium text-gray-800">{match.enterprise?.displayName}</p>
                </div>
                <div className="text-gray-400 text-xl">⇄</div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">BD方</p>
                  <p className="font-medium text-gray-800">{match.bd?.codeName}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                match.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                match.status === 'approved' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {match.status === 'pending' ? '待确认' : match.status === 'approved' ? '已撮合' : '已拒绝'}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-700">项目：{match.project?.title}</p>
              <p className="text-xs text-gray-400 mt-1">AI匹配分：{match.matchScore || '—'} 分</p>
            </div>

            {match.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleProcess(match.id, 'approve')}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700"
                >
                  确认撮合（建立沟通频道）
                </button>
                <button
                  onClick={() => handleProcess(match.id, 'reject')}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  暂不撮合
                </button>
              </div>
            )}
          </div>
        ))}

        {queue.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            暂无待处理撮合
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AuditQueue />} />
      <Route path="matches" element={<MatchQueue />} />
    </Routes>
  );
}
