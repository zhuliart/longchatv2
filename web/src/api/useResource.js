/* 通用数据拉取钩子（T6.1）：统一 loading / error / reload 语义，
   供各列表/详情页复用（对应 T6.5 加载骨架与网络异常路径）。
   约定：fetcher 内已消化「空态」（如匹配 1004 归一为 []），
   error 仅代表真正的加载失败，页面据此展示重试。 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetcher();
      if (alive.current) setData(d);
      return d;
    } catch (err) {
      if (alive.current) setError(err);
      return undefined;
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, loading, error, reload, setData };
}
