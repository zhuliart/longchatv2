/* 编辑资料（T5.4）：昵称 ≤20 / 介绍 20–60 字 / 标签 3–5（M6 接通 PATCH /users/me） */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { countWords } from '../utils/countWords.js';
import { PRESET_TAGS } from '../constants/index.js';
import { ME } from '../mocks/index.js';
import { useUI } from '../store/ui.jsx';

export function EditScreen() {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [nickname, setNickname] = useState(ME.nickname);
  const [intro, setIntro] = useState(ME.intro);
  const [tags, setTags] = useState(ME.tags);
  const introCount = countWords(intro);
  const introValid = introCount >= 20 && introCount <= 60;
  const back = () => navigate(-1);

  function toggleTag(t) {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length < 5) setTags([...tags, t]);
    else toast('最多选 5 个标签');
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
          <div className="btn btn-primary" style={{ width: '100%' }} onClick={() => { toast('资料已更新'); back(); }}>保存</div>
        </div>
      </div>
    </div>
  );
}
