import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/* ui store：toast（底部居中 1.8s，文案带 ✦）+ 深色模式（跟随主题推导，持久化） */

const DARK_KEY = 'pc_dark';
const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toastMsg, setToastMsg] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem(DARK_KEY) === '1');
  const timerRef = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(DARK_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ toastMsg, toast, dark, toggleDark }),
    [toastMsg, toast, dark, toggleDark]
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
