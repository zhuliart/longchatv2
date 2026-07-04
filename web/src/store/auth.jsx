import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/index.js';

/* auth store（T6.4）：token + refreshToken + hasProfile，localStorage 持久化。
   M6：login/register 由 POST /auth/* 发放 token；client 层 401 会派发
   'pc:unauthorized' 事件，这里兜底登出并回登录页。 */

const KEY = 'pc_auth';
const AuthContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { token: s.token || '', refreshToken: s.refreshToken || '', hasProfile: !!s.hasProfile };
    }
  } catch {
    /* 损坏的持久化数据按未登录处理 */
  }
  return { token: '', refreshToken: '', hasProfile: false };
}

function persist(state) {
  if (state.token) localStorage.setItem(KEY, JSON.stringify(state));
  else localStorage.removeItem(KEY);
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(load);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* 登录/注册成功：写入服务端发放的 { token, refreshToken, hasProfile } */
  const signIn = useCallback(({ token, refreshToken, hasProfile }) => {
    const next = { token, refreshToken: refreshToken || '', hasProfile: !!hasProfile };
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
    // 拉黑 refresh（幂等，失败忽略），access 短时效自然过期
    const rt = stateRef.current.refreshToken;
    if (rt) authApi.logout(rt).catch(() => {});
    persist({ token: '' });
    setState({ token: '', refreshToken: '', hasProfile: false });
  }, []);

  /* client 层遇 401 会派发事件：统一在此清态（守卫随即重定向登录页） */
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('pc:unauthorized', onUnauthorized);
    return () => window.removeEventListener('pc:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({ ...state, signIn, completeProfile, logout }),
    [state, signIn, completeProfile, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
