import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updatePassword: (data: any) => api.put('/auth/password', data),
};

export const facebookAPI = {
  connectAccount: (data: any) => api.post('/facebook/connect', data),
  getAccounts: () => api.get('/facebook/accounts'),
  syncAccount: (accountId: string) => api.post(`/facebook/${accountId}/sync`),
  getMonetizationStatus: (accountId: string) => api.get(`/facebook/${accountId}/monetization`),
  updatePageInfo: (accountId: string, data: any) => api.put(`/facebook/${accountId}/page`, data),
};

export const earningsAPI = {
  getEarnings: (params?: any) => api.get('/earnings', { params }),
  getSummary: (params?: any) => api.get('/earnings/summary', { params }),
  getByContent: (contentId: string) => api.get(`/earnings/content/${contentId}`),
  create: (data: any) => api.post('/earnings', data),
};

export const autopilotAPI = {
  getSettings: (accountId: string) => api.get(`/autopilot/settings/${accountId}`),
  updateSettings: (accountId: string, data: any) => api.put(`/autopilot/settings/${accountId}`, data),
  researchTrends: (category?: string) => api.post('/autopilot/trends/research', { category }),
  getTrends: (params?: any) => api.get('/autopilot/trends', { params }),
  generateContent: (data: any) => api.post('/autopilot/content/generate', data),
  predictPerformance: (data: any) => api.post('/autopilot/content/predict', data),
  generateHashtags: (data: any) => api.post('/autopilot/hashtags/generate', data),
  scheduleAutoPosts: (accountId: string) => api.post(`/autopilot/schedule/${accountId}`),
  getScheduledPosts: (params?: any) => api.get('/autopilot/scheduled', { params }),
  createScheduledPost: (data: any) => api.post('/autopilot/scheduled', data),
  cancelScheduledPost: (postId: string) => api.delete(`/autopilot/scheduled/${postId}`),
  getOptimalTimes: (accountId: string) => api.get(`/autopilot/optimal-times/${accountId}`),
};

export default api;
