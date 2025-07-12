import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
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

// API service functions
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  
  updateProfile: (data: any) => api.put('/users/profile', data),
  
  searchUsers: (params: any) => api.get('/users/search', { params }),
  
  getUserById: (id: number) => api.get(`/users/${id}`),
};

export const skillsAPI = {
  getSkills: () => api.get('/skills'),
  
  addSkill: (skill: any) => api.post('/skills', skill),
  
  updateSkill: (id: number, skill: any) => api.put(`/skills/${id}`, skill),
  
  deleteSkill: (id: number) => api.delete(`/skills/${id}`),
  
  getPopularSkills: () => api.get('/skills/popular'),
};

export const swapsAPI = {
  getSwapRequests: (params?: any) => api.get('/swaps', { params }),
  
  createSwapRequest: (data: any) => api.post('/swaps', data),
  
  updateSwapStatus: (id: number, data: { status: string }) =>
    api.put(`/swaps/${id}/status`, data),
  
  deleteSwapRequest: (id: number) => api.delete(`/swaps/${id}`),
};

export const ratingsAPI = {
  addRating: (swapId: number, data: any) =>
    api.post(`/ratings/swap/${swapId}`, data),
  
  getUserRatings: (userId: number) => api.get(`/ratings/user/${userId}`),
};

export const adminAPI = {
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  
  banUser: (id: number, is_banned: boolean) =>
    api.put(`/admin/users/${id}/ban`, { is_banned }),
  
  getSwaps: (params?: any) => api.get('/admin/swaps', { params }),
  
  getStats: () => api.get('/admin/stats'),
  
  sendMessage: (data: any) => api.post('/admin/messages', data),
  
  getMessages: () => api.get('/admin/messages'),
};