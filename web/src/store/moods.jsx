import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MOODS as MOCK_MOODS } from '../mocks/index.js';
import { ymd } from '../utils/date.js';

/* moods store（T5.7 todayMood）：心情记录列表 + 今日心情派生，
   首页卡片形态 / 旅程月历 / 走势共用。M6 换为 PUT /moods/:date 等接口。 */

const MoodsContext = createContext(null);

export function MoodsProvider({ children }) {
  const [moods, setMoods] = useState(MOCK_MOODS);

  /* 同日覆盖（幂等 upsert，与服务端语义一致） */
  const upsertMood = useCallback((mood) => {
    setMoods((arr) => {
      const i = arr.findIndex((m) => m.date === mood.date);
      if (i > -1) {
        const next = arr.slice();
        next[i] = { ...arr[i], ...mood };
        return next;
      }
      return [...arr, { _id: `md_${Date.now()}`, commentCount: 0, ...mood }];
    });
  }, []);

  const todayMood = useMemo(() => moods.find((m) => m.date === ymd()), [moods]);

  const value = useMemo(() => ({ moods, upsertMood, todayMood }), [moods, upsertMood, todayMood]);
  return <MoodsContext.Provider value={value}>{children}</MoodsContext.Provider>;
}

export function useMoods() {
  return useContext(MoodsContext);
}
