import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { bdApi, chatApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CreditScoreBadge from '../components/CreditScoreBadge';

// ── BD主页（虚拟身份展示）────────────────────────────────
function BDHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      bdApi.get('me').then(r => setProfile(r.data.bd)),
      bdApi.getCreditScore().then(r => setCreditData(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 个人信息卡 */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
              {profile?.codeName?.[0] || 'B'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.codeName || user.displayName}</h1>
              <p className="text-green-100 text-sm">虚拟身份 · 生物医药BD</p>
              <div className="mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  profile?.status === 'approved' ? 'bg-green-200 text-green-800' :
                  profile?.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {profile?.status === 'approved' ? '已认证' :
                   profile?.status === 'pending' ? '审核中' : '未认证'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/bd/edit-profile')}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm"
          >
            编辑资料
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 bg-white bg-opacity-10 rounded-xl p-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{creditData?.score || 0}</p>
            <p className="text-xs text-green-100">信用评分</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{profile?.successCases || 0}</p>
            <p className="text-xs text-green-100">成功案例</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{profile?.patentCount || 0}</p>
            <p className="text-xs text-green-100">专利数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{profile?.paperCount || 0}</p>
            <p className="text-xs text-green-100">论文数</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 能力标签 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">专业领域</h2>
          <div className="flex flex-wrap gap-2">
            {(profile?.expertiseTags || []).map(tag => (
              <span key={tag} className="bg-green-50 text-green-700 border border-green-200 text-sm px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
            {(!profile?.expertiseTags?.length) && (
              <p className="text-sm text-gray-400">还未添加专业标签</p>
            )}
          </div>
        </div>

        {/* 信用评分详情 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">信用评分详情</h2>
          {creditData?.breakdown && (
            <div className="space-y-2">
              {Object.entries(creditData.breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{val.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${(val.score / val.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{val.score}/{val.max}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 简介 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">职业简介</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{profile?.summary || '还未填写职业简介'}</p>
      </div>
    </div>
  );
}

// ── 编辑BD资料 ────────────────────────────────────────────
function EditProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    codeName: '', summary: '', expertiseTags: '',
    yearsExperience: '', patentCount: 0, paperCount: 0,
    successCases: 0, linkedinUrl: '', githubUrl: '',
    publications: '', achievements: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    bdApi.get('me').then(r => {
      const bd = r.data.bd;
      setForm({
        ...bd,
        expertiseTags: (bd.expertiseTags || []).join(', '),
      });
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        expertiseTags: form.expertiseTags.split(',').map(t => t.trim()).filter(Boolean),
      };
      await bdApi.updateProfile(payload);
      navigate('/bd');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/bd')} className="text-gray-400 hover:text-gray-600">← 返回</button>
        <h1 className="text-2xl font-bold text-gray-900">编辑虚拟身份</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">虚拟代号 *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.codeName} onChange={e => setForm({ ...form, codeName: e.target.value })}
            placeholder="用于平台展示的匿名代号，如：生物谷BD-A"
            required
          />
          <p className="text-xs text-gray-400 mt-1">此代号将用于平台展示，保护真实身份</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">职业简介</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
            value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
            placeholder="简述您的专业背景、核心能力和行业经验（不要包含可识别真实身份的信息）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">专业领域标签（逗号分隔）</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.expertiseTags} onChange={e => setForm({ ...form, expertiseTags: e.target.value })}
            placeholder="如：抗体药物, 临床CRO, IND申报, 肿瘤学, 细胞治疗"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">行业经验（年）</label>
            <input
              type="number" min="0" max="50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.yearsExperience} onChange={e => setForm({ ...form, yearsExperience: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">成功撮合案例数</label>
            <input
              type="number" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.successCases} onChange={e => setForm({ ...form, successCases: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">专利数量</label>
            <input
              type="number" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.patentCount} onChange={e => setForm({ ...form, patentCount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发表论文数</label>
            <input
              type="number" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.paperCount} onChange={e => setForm({ ...form, paperCount: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主要成就（AI背调用）</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20"
            value={form.achievements} onChange={e => setForm({ ...form, achievements: e.target.value })}
            placeholder="如：主导某类抗体药物从IND到NDA的全程注册，成功促成3个CDMO合作项目..."
          />
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? '保存中...' : '保存资料'}
        </button>
      </form>
    </div>
  );
}

// ── 项目邀请列表 ──────────────────────────────────────────
function Invitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bdApi.getInvitations().then(r => setInvitations(r.data.invitations)).finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    await bdApi.acceptInvitation(id);
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'accepted' } : inv));
  };

  const handleDecline = async (id) => {
    await bdApi.declineInvitation(id);
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'declined' } : inv));
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">项目邀请</h1>

      {invitations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400">暂无项目邀请</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{inv.project?.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    来自：{inv.enterprise?.displayName} · {new Date(inv.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  inv.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {inv.status === 'pending' ? '待回复' : inv.status === 'accepted' ? '已接受' : '已拒绝'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{inv.project?.description}</p>

              {inv.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(inv.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                  >
                    接受邀请
                  </button>
                  <button
                    onClick={() => handleDecline(inv.id)}
                    className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200"
                  >
                    婉拒
                  </button>
                </div>
              )}

              {inv.status === 'accepted' && (
                <Link
                  to={`/bd/chat/${inv.chatRoomId}`}
                  className="block text-center bg-green-50 text-green-700 py-2 rounded-lg text-sm hover:bg-green-100"
                >
                  进入项目沟通频道
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BDDashboard() {
  return (
    <Routes>
      <Route index element={<BDHome />} />
      <Route path="edit-profile" element={<EditProfile />} />
      <Route path="invitations" element={<Invitations />} />
    </Routes>
  );
}
