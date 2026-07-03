import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

/**
 * M0 占位壳：仅验证脚手架、路由与 /api 代理连通。
 * M5 起按 design/.../prototype/ 像素还原真实屏幕。
 */
function Placeholder() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const ping = async () => {
    setError('');
    setHealth(null);
    try {
      const res = await fetch('/api/v1/health');
      setHealth(await res.json());
    } catch {
      setError('后端未连通：请先启动 server（npm run dev）');
    }
  };

  return (
    <main className="m0-shell">
      <div className="m0-seal">常</div>
      <h1>平常 PingChang · Web</h1>
      <p className="m0-sub">脚手架就绪（M0）。像素还原自 M5 开始。</p>
      <button className="m0-btn" onClick={ping}>
        测试 /api/v1/health 代理
      </button>
      {health && <pre className="m0-pre">{JSON.stringify(health, null, 2)}</pre>}
      {error && <p className="m0-err">{error}</p>}
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Placeholder />} />
    </Routes>
  );
}
