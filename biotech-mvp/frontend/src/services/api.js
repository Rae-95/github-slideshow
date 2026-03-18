import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const projectsApi = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getMatches: (id) => api.get(`/projects/${id}/matches`),
  inviteBD: (projectId, bdId) => api.post(`/projects/${projectId}/invite/${bdId}`),
};

export const bdApi = {
  list: (params) => api.get('/bds', { params }),
  get: (id) => api.get(`/bds/${id}`),
  updateProfile: (data) => api.put('/bds/profile', data),
  getInvitations: () => api.get('/bds/invitations'),
  acceptInvitation: (id) => api.post(`/bds/invitations/${id}/accept`),
  declineInvitation: (id) => api.post(`/bds/invitations/${id}/decline`),
  getCreditScore: () => api.get('/bds/credit-score'),
};

export const aiApi = {
  generateReport: (bdId) => api.post(`/ai/report/${bdId}`),
  getReport: (bdId) => api.get(`/ai/report/${bdId}`),
  matchScore: (projectId, bdId) => api.get(`/ai/match-score/${projectId}/${bdId}`),
};

export const adminApi = {
  getPendingBDs: () => api.get('/admin/pending-bds'),
  approveBD: (id) => api.post(`/admin/approve-bd/${id}`),
  rejectBD: (id, reason) => api.post(`/admin/reject-bd/${id}`, { reason }),
  getPendingEnterprises: () => api.get('/admin/pending-enterprises'),
  approveEnterprise: (id) => api.post(`/admin/approve-enterprise/${id}`),
  getMatchQueue: () => api.get('/admin/match-queue'),
  processMatch: (id, action) => api.post(`/admin/match-queue/${id}/${action}`),
};

export const chatApi = {
  getRooms: () => api.get('/chat/rooms'),
  getMessages: (roomId) => api.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, content) => api.post(`/chat/rooms/${roomId}/messages`, { content }),
};

export default api;
