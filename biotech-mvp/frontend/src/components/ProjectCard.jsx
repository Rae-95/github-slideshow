import React from 'react';
import { Link } from 'react-router-dom';

const typeColors = {
  research: 'bg-purple-100 text-purple-700',
  cdmo: 'bg-blue-100 text-blue-700',
  clinical: 'bg-green-100 text-green-700',
  procurement: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

const typeLabels = {
  research: '科研合作',
  cdmo: 'CDMO服务',
  clinical: '临床试验',
  procurement: '采购需求',
  other: '其他',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  matching: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-600',
};

const statusLabels = {
  draft: '草稿',
  open: '招募中',
  matching: '撮合中',
  closed: '已关闭',
};

export default function ProjectCard({ project, showActions, onInvite }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[project.type] || typeColors.other}`}>
            {typeLabels[project.type] || project.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </div>
        <span className="text-xs text-gray-400">{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-2">
        <Link to={`/projects/${project.id}`} className="hover:text-blue-600">{project.title}</Link>
      </h3>

      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {(project.tags || []).map(tag => (
          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{tag}</span>
        ))}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-3">
        <span>预算：{project.budget || '面议'}</span>
        <span>周期：{project.duration || '待定'}</span>
        <span>匹配BD：{project.matchCount || 0} 个</span>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3">
          <Link
            to={`/projects/${project.id}`}
            className="flex-1 text-center text-sm bg-blue-50 text-blue-600 py-1.5 rounded-lg hover:bg-blue-100"
          >
            查看详情
          </Link>
          {project.status === 'open' && onInvite && (
            <button
              onClick={() => onInvite(project.id)}
              className="flex-1 text-sm bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700"
            >
              邀请BD
            </button>
          )}
        </div>
      )}
    </div>
  );
}
