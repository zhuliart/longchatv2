import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/* auth store（T5.7）：token + hasProfile，localStorage 持久化。
   M5 静态阶段 login/register 写入 mock token；M6 换为 POST /auth/*。 */

const KEY = 'pc_auth';
const AuthContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 损坏的持久化数据按未登录处理 */
  }
  return { token: '', hasProfile: false };
}

function persist(state) {
  if (state.token) localStorage.setItem(KEY, JSON.stringify(state));
  else localStorage.removeItem(KEY);
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(load);

  const login = useCallback((token, hasProfile) => {
    const next = { token, hasProfile };
    persist(next);
    setState(next);
  }, []);

  const completeProfile = useCallback(() => {
    setState((s) => {
      const next = { ...s, hasProfile: true };
      persist(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    persist({ token: '' });
    setState({ token: '', hasProfile: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, completeProfile, logout }),
    [state, login, completeProfile, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
