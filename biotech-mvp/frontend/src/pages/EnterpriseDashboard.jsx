import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { projectsApi, bdApi } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import AnonymousBDCard from '../components/AnonymousBDCard';

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

// ── BD列表（企业视角，全匿名展示）───────────────────────
function BDList() {
  const [bds, setBDs] = useState([]);
  const [filters, setFilters] = useState({ expertise: '', minScore: 0, keyword: '' });
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.all([
      bdApi.list().then(r => setBDs(r.data.bds)),
      projectsApi.list().then(r => setProjects(r.data.projects.filter(p => p.status === 'open'))),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    setLoading(true);
    bdApi.list(filters).then(r => setBDs(r.data.bds)).finally(() => setLoading(false));
  };

  const handleInvite = async (projectId, bdId) => {
    await projectsApi.inviteBD(projectId, bdId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BD资源库</h1>
          <p className="text-sm text-gray-400 mt-1">所有BD以虚拟身份展示，真实信息撮合成功后解锁</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <span className="text-sm">🔒</span>
          <span className="text-xs text-yellow-700">匿名保护模式</span>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40"
            placeholder="搜索能力标签、关键词..."
            value={filters.keyword}
            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={filters.expertise}
            onChange={e => setFilters({ ...filters, expertise: e.target.value })}
          >
            <option value="">全部领域</option>
            <option value="肿瘤">肿瘤学</option>
            <option value="免疫">免疫学</option>
            <option value="CDMO">CDMO</option>
            <option value="临床">临床研究</option>
            <option value="注册">注册法规</option>
            <option value="细胞治疗">细胞治疗</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={filters.minScore}
            onChange={e => setFilters({ ...filters, minScore: Number(e.target.value) })}
          >
            <option value={0}>信用分不限</option>
            <option value={70}>A级以上（70+）</option>
            <option value={80}>AA级以上（80+）</option>
            <option value={90}>AAA级（90+）</option>
          </select>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            搜索
          </button>
        </div>

        {/* 邀请时关联项目选择 */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">邀请时关联项目：</span>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm flex-1 max-w-xs"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
            >
              <option value="">选择项目（可选）</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : bds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400">暂未找到符合条件的BD</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bds.map(bd => (
            <AnonymousBDCard
              key={bd.id}
              bd={bd}
              projectId={selectedProject || undefined}
              onInvite={selectedProject ? handleInvite : undefined}
            />
          ))}
        </div>
      )}
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
