/* 编辑资料（T5.4 / T6.3 编辑资料保存）：昵称 ≤20 / 介绍 20–60 字 / 标签 3–5 → PATCH /users/me；
   成功后同步全局用户态（user store）。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { SkeletonList } from '../components/states.jsx';
import { countWords } from '../utils/countWords.js';
import { PRESET_TAGS } from '../constants/index.js';
import { usersApi, ApiError } from '../api/index.js';
import { useUser } from '../store/user.jsx';
import { useUI } from '../store/ui.jsx';

/* 资料未就位时（直接刷新 /edit）先出骨架，就绪后再挂载表单，保证初值来自权威资料。 */
export function EditScreen() {
  const navigate = useNavigate();
  const { me } = useUser();
  if (!me) {
    return (
      <div className="page is-overlay">
        <StatusBar dark />
        <NavBar title="编辑资料" onBack={() => navigate(-1)} />
        <div className="page-scroll" style={{ padding: 16 }}><SkeletonList rows={3} /></div>
      </div>
    );
  }
  return <EditForm me={me} />;
}

function EditForm({ me }) {
  const navigate = useNavigate();
  const { toast } = useUI();
  const { setMe } = useUser();
  const [nickname, setNickname] = useState(me.nickname || '');
  const [intro, setIntro] = useState(me.intro || '');
  const [tags, setTags] = useState(me.tags || []);
  const [saving, setSaving] = useState(false);
  const introCount = countWords(intro);
  const introValid = introCount >= 20 && introCount <= 60;
  const back = () => navigate(-1);

  function toggleTag(t) {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length < 5) setTags([...tags, t]);
    else toast('最多选 5 个标签');
  }

  async function save() {
    if (saving) return;
    if (!nickname.trim()) return toast('请填写昵称');
    if (!introValid) return toast('介绍需 20–60 字');
    if (tags.length < 3) return toast('至少选 3 个标签');
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({ nickname: nickname.trim(), intro: intro.trim(), tags });
      setMe(updated); // 服务端复校后的权威资料（含聚合统计）回写全局
      toast('资料已更新');
      back();
    } catch (err) {
      if (err instanceof ApiError && (err.code === 1001 || err.code === 1002)) toast(err.message);
      // 9001 已由 client 层 toast
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="编辑资料" onBack={back} />
      <div className="page-scroll">
        <div className="step-content">
          <div className="form-card card">
            <span className="form-label">昵称</span>
            <input className="form-input" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-card card">
            <div className="form-label-row">
              <span className="form-label">一句话介绍</span>
              <span className={'form-count' + (introValid ? ' ok' : '')}>{introCount} / 20-60字</span>
            </div>
            <textarea className="form-input form-textarea" value={intro} onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div className="form-card card">
            <span className="form-label">兴趣标签 · 已选 {tags.length}</span>
            <div className="tags-grid" style={{ marginTop: 12, marginBottom: 0 }}>
              {PRESET_TAGS.map((t) => (
                <div key={t} className={'tag-option' + (tags.includes(t) ? ' selected' : '')} onClick={() => toggleTag(t)}>{t}</div>
              ))}
            </div>
          </div>
          <div className={'btn btn-primary' + (saving ? ' btn-disabled' : '')} style={{ width: '100%' }} onClick={save}>{saving ? '保存中…' : '保存'}</div>
        </div>
      </div>
    </div>
  );
}
