import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { projectsApi, bdApi } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import CreditScoreBadge from '../components/CreditScoreBadge';

// ── 项目列表 ──────────────────────────────────────────────
function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    projectsApi.list().then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">加载项目中...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的项目</h1>
        <button
          onClick={() => navigate('/enterprise/projects/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + 发布新项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 mb-4">还没有发布项目</p>
          <button
            onClick={() => navigate('/enterprise/projects/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm"
          >
            立即发布
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => <ProjectCard key={p.id} project={p} showActions />)}
        </div>
      )}
    </div>
  );
}

// ── 发布项目表单 ──────────────────────────────────────────
function CreateProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', type: 'research', description: '',
    requirements: '', budget: '', duration: '', tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      await projectsApi.create(payload);
      navigate('/enterprise');
    } catch (err) {
      setError(err.response?.data?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/enterprise')} className="text-gray-400 hover:text-gray-600">← 返回</button>
        <h1 className="text-2xl font-bold text-gray-900">发布新项目</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目标题 *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="例：寻求PD-1单抗CDMO合作方" required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目类型 *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option value="research">科研合作</option>
            <option value="cdmo">CDMO服务</option>
            <option value="clinical">临床试验</option>
            <option value="procurement">采购需求</option>
            <option value="other">其他合作</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目描述 *</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 h-28"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="详细描述项目背景、目标和预期成果" required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BD要求</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 h-20"
            value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })}
            placeholder="期望BD具备的能力、经验或资源（如：有三甲医院KOL资源，熟悉MAH政策等）"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预算范围</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
              placeholder="如：50-100万RMB"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目周期</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
              placeholder="如：6-12个月"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签（逗号分隔）</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="如：单抗, 肿瘤, IND申报, 北京"
          />
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '提交中...' : '发布项目'}
        </button>
      </form>
    </div>
  );
}

// ── BD列表（企业视角）─────────────────────────────────────
function BDList() {
  const [bds, setBDs] = useState([]);
  const [filters, setFilters] = useState({ expertise: '', minScore: 0, keyword: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bdApi.list(filters).then(r => setBDs(r.data.bds)).finally(() => setLoading(false));
  }, []);

  const search = () => {
    setLoading(true);
    bdApi.list(filters).then(r => setBDs(r.data.bds)).finally(() => setLoading(false));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">BD资源库</h1>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40"
          placeholder="搜索关键词..."
          value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filters.expertise} onChange={e => setFilters({ ...filters, expertise: e.target.value })}
        >
          <option value="">全部领域</option>
          <option value="oncology">肿瘤学</option>
          <option value="immunology">免疫学</option>
          <option value="cdmo">CDMO</option>
          <option value="clinical">临床研究</option>
          <option value="regulatory">注册法规</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filters.minScore} onChange={e => setFilters({ ...filters, minScore: Number(e.target.value) })}
        >
          <option value={0}>信用分不限</option>
          <option value={60}>60分以上</option>
          <option value={70}>70分以上</option>
          <option value={80}>80分以上</option>
          <option value={90}>90分以上</option>
        </select>
        <button onClick={search} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">搜索</button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bds.map(bd => <BDCard key={bd.id} bd={bd} />)}
        </div>
      )}
    </div>
  );
}

function BDCard({ bd }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {bd.codeName?.[0] || 'B'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{bd.codeName}</p>
            <p className="text-xs text-gray-400">虚拟身份 · {bd.yearsExperience}年经验</p>
          </div>
        </div>
        <CreditScoreBadge score={bd.creditScore} />
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(bd.expertiseTags || []).slice(0, 4).map(tag => (
          <span key={tag} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{bd.summary}</p>

      <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500 border-t pt-3 mb-3">
        <div><p className="font-semibold text-gray-800">{bd.patentCount || 0}</p><p>专利数</p></div>
        <div><p className="font-semibold text-gray-800">{bd.paperCount || 0}</p><p>论文数</p></div>
        <div><p className="font-semibold text-gray-800">{bd.successCases || 0}</p><p>成功案例</p></div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/bd-profile/${bd.id}`}
          className="flex-1 text-center text-sm bg-gray-50 text-gray-600 py-1.5 rounded-lg hover:bg-gray-100"
        >
          查看资料
        </Link>
        <Link
          to={`/ai-report/${bd.id}`}
          className="flex-1 text-center text-sm bg-blue-50 text-blue-600 py-1.5 rounded-lg hover:bg-blue-100"
        >
          AI背调报告
        </Link>
      </div>
    </div>
  );
}

// ── 企业端主路由 ──────────────────────────────────────────
export default function EnterpriseDashboard() {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="projects/new" element={<CreateProject />} />
      <Route path="bds" element={<BDList />} />
    </Routes>
  );
}
