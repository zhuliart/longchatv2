/* Toast（T5.3）：底部居中，1.8s 自动消失（计时在 ui store），文案带 ✦ */
import { useUI } from '../store/ui.jsx';

export function Toast() {
  const { toastMsg } = useUI();
  if (!toastMsg) return null;
  return <div className="toast">{toastMsg}</div>;
}
