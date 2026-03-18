import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const typeLabels = {
  research: '科研合作', cdmo: 'CDMO服务',
  clinical: '临床试验', procurement: '采购需求', other: '其他',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.get(id).then(r => setProject(r.data.project)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!project) return <div className="text-center py-20 text-gray-500">项目不存在</div>;

  const isMasked = project._masked;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={user?.role === 'enterprise' ? '/enterprise' : '/bd'} className="text-gray-400 hover:text-gray-600 text-sm">
        ← 返回
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
        <div className="flex gap-2 mb-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {typeLabels[project.type] || project.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            project.status === 'open' ? 'bg-green-100 text-green-700' :
            project.status === 'matching' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {project.status === 'open' ? '招募中' : project.status === 'matching' ? '撮合中' : project.status}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>

        {/* 项目方信息（BD视角脱敏） */}
        <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
          <span>发布方：</span>
          <span className={`font-medium ${isMasked ? 'text-gray-400 italic' : 'text-gray-700'}`}>
            {project.enterpriseName}
          </span>
          {isMasked && (
            <span className="text-xs bg-gray-100 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">
              🔒 撮合后解锁
            </span>
          )}
        </div>

        <div className="space-y-5">
          <Section title="项目描述" content={project.description} />
          <Section
            title={isMasked ? 'BD要求（部分脱敏）' : 'BD要求'}
            content={project.requirements}
            masked={isMasked}
          />

          <div className="grid grid-cols-2 gap-4">
            <InfoBox label="预算范围" value={project.budget} masked={isMasked} />
            <InfoBox label="项目周期" value={project.duration} />
          </div>

          {(project.tags || []).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">项目标签</p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {isMasked && (
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 flex items-center gap-1.5">
              <span>🔒</span>
              <span>部分项目信息已脱敏保护，接受邀请并经平台确认撮合后将自动解锁完整信息。</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, content, masked }) {
  if (!content) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
        {title}
        {masked && <span className="text-xs text-gray-400">(部分脱敏)</span>}
      </p>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg p-3">
        {content}
      </p>
    </div>
  );
}

function InfoBox({ label, value, masked }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-medium ${masked ? 'text-gray-400 italic' : 'text-gray-700'}`}>
        {value || '待定'}
        {masked && value && <span className="text-xs ml-1">(撮合后精确)</span>}
      </p>
    </div>
  );
}
