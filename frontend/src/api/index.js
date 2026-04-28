import axios from 'axios';

// 1. Create a dynamic URL that checks for the Vercel variable first
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL, // 2. Use the dynamic URL here
  timeout: 30000,
});
// Needs
export const getNeedsAll    = (params = {}) => api.get('/needs', { params });
export const getUrgentNeeds = ()            => api.get('/needs/urgent');
export const uploadNeedsCSV = (formData)    => api.post('/needs/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const resolveNeed    = (id)          => api.post(`/needs/${id}/resolve`);

// Volunteers
export const getVolunteers      = (params = {}) => api.get('/volunteers', { params });
export const registerVolunteer  = (data)        => api.post('/volunteers/register', data);

// Matching
export const runMatching = ()         => api.post('/match/run');
export const getMatches  = (params={})=> api.get('/matches', { params });
export const acceptMatch = (id)       => api.post(`/matches/${id}/accept`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Demo
export const runDemo = () => api.post('/demo/run');

// Analytics
export const getSkillDistribution = () => api.get('/analytics/skills');
export const getTimeline           = () => api.get('/analytics/timeline');

// AI Assistant — sends prompt + optional conversation history
export const askAI = (prompt, history = []) =>
  api.post('/ai/query', { prompt, history });

export default api;
