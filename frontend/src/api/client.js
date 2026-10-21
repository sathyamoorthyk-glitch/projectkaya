import axios from 'axios';

const TOKEN_KEY = 'kg_token';
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Token ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && getToken()) { clearToken(); window.dispatchEvent(new Event('kg:logout')); }
  return Promise.reject(err);
});

// Turns any Django/DRF error into one readable sentence
export function errMsg(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.message === 'Network Error') return 'Cannot reach the server. Please check that the backend is running.';
  const d = err?.response?.data;
  if (!d) return err?.message || fallback;
  if (typeof d === 'string') return d.length < 300 ? d : fallback;
  if (d.detail) return Array.isArray(d.detail) ? d.detail.join(' ') : String(d.detail);
  const parts = Object.entries(d).map(([k, v]) => {
    const msg = Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return k === 'non_field_errors' ? msg : `${k.replace(/_/g, ' ')}: ${msg}`;
  });
  return parts.join(' ') || fallback;
}

export async function downloadPdf(path, filename) {
  const r = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default api;
