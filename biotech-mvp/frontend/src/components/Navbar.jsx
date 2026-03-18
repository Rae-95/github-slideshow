import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = { enterprise: '企业端', bd: 'BD端', admin: '平台管理' };
  const roleColor = { enterprise: 'bg-blue-600', bd: 'bg-green-600', admin: 'bg-purple-600' };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BioLink MVP</span>
            </Link>
            <span className="text-xs text-gray-400">生物医药撮合平台</span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className={`text-xs text-white px-2 py-1 rounded-full ${roleColor[user.role]}`}>
                  {roleLabel[user.role]}
                </span>
                <span className="text-sm text-gray-700 font-medium">{user.displayName}</span>
                {user.role === 'enterprise' && (
                  <>
                    <Link to="/enterprise" className="text-sm text-gray-600 hover:text-blue-600">项目管理</Link>
                    <Link to="/enterprise/bds" className="text-sm text-gray-600 hover:text-blue-600">BD列表</Link>
                  </>
                )}
                {user.role === 'bd' && (
                  <>
                    <Link to="/bd" className="text-sm text-gray-600 hover:text-green-600">我的主页</Link>
                    <Link to="/bd/invitations" className="text-sm text-gray-600 hover:text-green-600">项目邀请</Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin" className="text-sm text-gray-600 hover:text-purple-600">审核队列</Link>
                    <Link to="/admin/matches" className="text-sm text-gray-600 hover:text-purple-600">撮合管理</Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-700 border border-red-300 px-3 py-1 rounded-md"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600">登录</Link>
                <Link to="/register" className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
