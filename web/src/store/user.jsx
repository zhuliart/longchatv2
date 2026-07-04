/* user store（T6.2 #1/#2、T6.4）：当前登录用户资料 + 服务端聚合统计。
   ME/STATS 全站唯一来源 —— 登录且已完成引导后拉 GET /users/me；
   编辑资料 / 记录心情 / 收发信后由页面调用 refresh() 或 setMe() 同步。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/index.js';
import { useAuth } from './auth.jsx';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { token, hasProfile } = useAuth();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token || !hasProfile) return undefined;
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getMe();
      setMe(data);
      return data;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [token, hasProfile]);

  /* 登录态或引导状态变化时重新拉取；登出后清空缓存资料 */
  useEffect(() => {
    if (token && hasProfile) refresh();
    else setMe(null);
  }, [token, hasProfile, refresh]);

  const value = useMemo(
    () => ({ me, loading, error, refresh, setMe }),
    [me, loading, error, refresh]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
