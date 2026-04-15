import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  uploadAvatar: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/users/avatar', fd)
  },
}

// Campaigns
export const campaignsApi = {
  list: () => api.get('/campaigns'),
  get: (slug) => api.get(`/campaigns/${slug}`),
  create: (data) => api.post('/campaigns', data),
  update: (slug, data) => api.put(`/campaigns/${slug}`, data),
  uploadCover: (slug, file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/campaigns/${slug}/cover`, fd)
  },
  join: (slug, joinCode) => api.post(`/campaigns/${slug}/join`, { join_code: joinCode }),
  leave: (slug) => api.post(`/campaigns/${slug}/leave`),
  getJoinCode: (slug) => api.get(`/campaigns/${slug}/join-code`),
  regenJoinCode: (slug) => api.post(`/campaigns/${slug}/join-code/regenerate`),
  updateMemberRole: (slug, userId, role) =>
    api.put(`/campaigns/${slug}/members/${userId}/role`, { role }),
  removeMember: (slug, userId) =>
    api.delete(`/campaigns/${slug}/members/${userId}`),
}

// Characters
export const charactersApi = {
  list: (slug, params) => api.get(`/campaigns/${slug}/characters`, { params }),
  get: (slug, id) => api.get(`/campaigns/${slug}/characters/${id}`),
  create: (slug, data) => api.post(`/campaigns/${slug}/characters`, data),
  update: (slug, id, data) => api.put(`/campaigns/${slug}/characters/${id}`, data),
  delete: (slug, id) => api.delete(`/campaigns/${slug}/characters/${id}`),
  uploadPortrait: (slug, id, file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/campaigns/${slug}/characters/${id}/portrait`, fd)
  },
}

// Wiki
export const wikiApi = {
  list: (slug, params) => api.get(`/campaigns/${slug}/wiki`, { params }),
  get: (slug, id) => api.get(`/campaigns/${slug}/wiki/${id}`),
  create: (slug, data) => api.post(`/campaigns/${slug}/wiki`, data),
  update: (slug, id, data) => api.put(`/campaigns/${slug}/wiki/${id}`, data),
  delete: (slug, id) => api.delete(`/campaigns/${slug}/wiki/${id}`),
  tags: (slug) => api.get(`/campaigns/${slug}/wiki/tags`),
  uploadCover: (slug, id, file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/campaigns/${slug}/wiki/${id}/cover`, fd)
  },
}

// Logs
export const logsApi = {
  list: (slug, params) => api.get(`/campaigns/${slug}/logs`, { params }),
  get: (slug, id) => api.get(`/campaigns/${slug}/logs/${id}`),
  create: (slug, data) => api.post(`/campaigns/${slug}/logs`, data),
  update: (slug, id, data) => api.put(`/campaigns/${slug}/logs/${id}`, data),
  delete: (slug, id) => api.delete(`/campaigns/${slug}/logs/${id}`),
}

// Documents
export const documentsApi = {
  list: (slug, params) => api.get(`/campaigns/${slug}/documents`, { params }),
  upload: (slug, formData) => api.post(`/campaigns/${slug}/documents`, formData),
  delete: (slug, id) => api.delete(`/campaigns/${slug}/documents/${id}`),
}

// Search
export const searchApi = {
  search: (slug, q) => api.get(`/campaigns/${slug}/search`, { params: { q } }),
}

// Admin
export const adminApi = {
  listUsers: () => api.get('/users'),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
}
