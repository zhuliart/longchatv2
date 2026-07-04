/* moods store（T6.2 #8/#9、T6.3）：只持有「今日心情」这一处跨页共享状态
   （首页卡片形态 / 桌面此刻 共用）。月历、走势、详情各页按 year/month 自取
   GET /moods（见 JourneyScreen / DJourney），保存今日后回写此处保持一致。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { moodsApi } from '../api/index.js';
import { ymd } from '../utils/date.js';
import { useAuth } from './auth.jsx';

const MoodsContext = createContext(null);

/* 记录/更新今日心情：PUT /moods/:today。服务端响应不含 diary/commentCount，
   合并本地 payload 与既有记录，得到用于卡片/月历渲染的完整心情对象。 */
export function mergeSavedMood(saved, payload, prev) {
  return {
    commentCount: prev?.commentCount ?? 0,
    ...prev,
    ...saved,
    diary: payload.diary ?? '',
    emotionLabel: payload.emotionLabel,
  };
}

export function MoodsProvider({ children }) {
  const { token, hasProfile } = useAuth();
  const [todayMood, setTodayMood] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const todayRef = useRef(null);
  todayRef.current = todayMood;

  const reloadToday = useCallback(async () => {
    if (!token || !hasProfile) {
      setTodayMood(null);
      setLoaded(true);
      return;
    }
    try {
      const now = new Date();
      const list = await moodsApi.getMoods(now.getFullYear(), now.getMonth() + 1);
      setTodayMood(list.find((m) => m.date === ymd()) || null);
    } catch {
      /* 首页今日卡加载失败时退化为「未记录」态，不阻塞其余内容 */
      setTodayMood(null);
    } finally {
      setLoaded(true);
    }
  }, [token, hasProfile]);

  useEffect(() => {
    reloadToday();
  }, [reloadToday]);

  /* 记录今日心情并回写共享态；返回合并后的完整心情对象供页面更新本地月历。 */
  const saveToday = useCallback(async (payload) => {
    const saved = await moodsApi.saveMood(ymd(), payload);
    const merged = mergeSavedMood(saved, payload, todayRef.current);
    setTodayMood(merged);
    return merged;
  }, []);

  const value = useMemo(
    () => ({ todayMood, setTodayMood, saveToday, reloadToday, loaded }),
    [todayMood, saveToday, reloadToday, loaded]
  );
  return <MoodsContext.Provider value={value}>{children}</MoodsContext.Provider>;
}

export function useMoods() {
  return useContext(MoodsContext);
}
