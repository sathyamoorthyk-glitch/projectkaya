import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { clearToken, getToken, setToken } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  const [addresses, setAddresses] = useState([]);

  const loadAddresses = useCallback(async () => {
    try { setAddresses((await api.get('/users/addresses/')).data); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api.get('/users/me/').then((r) => setUser(r.data)).catch(() => clearToken()).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (user) loadAddresses(); else setAddresses([]); }, [user?.id, loadAddresses]);
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('kg:logout', h);
    return () => window.removeEventListener('kg:logout', h);
  }, []);

  const authed = async (path, body) => {
    const r = await api.post(path, body);
    setToken(r.data.token); setUser(r.data.user);
    return r.data.user;
  };

  const value = {
    user, ready, addresses, loadAddresses, setUser, authed,
    login: (email, password) => authed('/users/login/', { email, password }),
    signup: (payload) => authed('/users/signup/', payload),
    acceptTerms: async () => { const r = await api.post('/users/accept-terms/'); setUser(r.data); return r.data; },
    logout: async () => { try { await api.post('/users/logout/'); } catch { /* ignore */ } clearToken(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
