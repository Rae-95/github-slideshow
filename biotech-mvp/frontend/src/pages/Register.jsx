import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', companyName: '', creditCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({ ...form, role });
      navigate(role === 'enterprise' ? '/enterprise' : '/bd');
    } catch (err) {
      setError(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">创建账号</h1>
          <p className="text-gray-500 text-sm mt-2">加入 BioLink 生物医药撮合平台</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6">选择您的角色</h2>
              <div className="space-y-3">
                <button
                  onClick={() => { setRole('enterprise'); setStep(2); }}
                  className="w-full border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="font-semibold text-gray-900 mb-1">🏢 企业端</div>
                  <div className="text-sm text-gray-500">发布科研合作、CDMO、临床试验等项目需求，寻找合适的BD资源</div>
                </button>
                <button
                  onClick={() => { setRole('bd'); setStep(2); }}
                  className="w-full border-2 border-gray-200 hover:border-green-500 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="font-semibold text-gray-900 mb-1">👤 BD端</div>
                  <div className="text-sm text-gray-500">注册虚拟身份，展示生物医药专业能力，接收项目邀请</div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 text-sm mb-4">← 返回</button>
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                {role === 'enterprise' ? '企业注册' : 'BD注册'}
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="至少8位，包含字母和数字" required minLength={8}
                  />
                </div>

                {role === 'enterprise' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">企业名称 *</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                        value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value, displayName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">统一社会信用代码 *</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                        value={form.creditCode} onChange={e => setForm({ ...form, creditCode: e.target.value })}
                        placeholder="用于身份核验" required
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系人姓名 *</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                      placeholder="真实姓名（不对外展示，仅平台核验用）" required
                    />
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                  {role === 'enterprise'
                    ? '企业信息将由平台审核，审核通过后方可发布项目。'
                    : 'BD真实身份仅平台可见，对企业以虚拟代号展示，保护您的隐私。'}
                </div>

                <button
                  type="submit" disabled={loading}
                  className={`w-full text-white py-2.5 rounded-lg font-medium disabled:opacity-50 ${
                    role === 'enterprise' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? '注册中...' : '提交注册申请'}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            已有账号？
            <Link to="/login" className="text-blue-600 hover:underline ml-1">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
