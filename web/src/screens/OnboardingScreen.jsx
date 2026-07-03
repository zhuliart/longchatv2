/* 注册引导 3 步（T5.4）：①昵称+介绍 20–60 字 ②标签 3–5/30 ③活跃时段+频率；顶部进度条。
   注册后 hasProfile=false 由路由守卫强制进入本页（T5.7）；「我的-重看引导」亦可进入。
   完成提交 M6 接通 POST /users/profile。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { countWords } from '../utils/countWords.js';
import { PRESET_TAGS } from '../constants/index.js';
import { useAuth } from '../store/auth.jsx';
import { useUI } from '../store/ui.jsx';

const ACTIVE_OPTIONS = [['morning', '🌅', '清晨'], ['afternoon', '☀', '午后'], ['night', '🌙', '夜深']];
const FREQ_OPTIONS = [
  ['weekly', '每周一封', '保持频繁联系，分享日常'],
  ['biweekly', '每两周一封', '不急不缓，慢慢交流'],
  ['free', '随缘', '灵感来了就写，不受时间约束'],
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { hasProfile, completeProfile, logout } = useAuth();
  const { toast } = useUI();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [intro, setIntro] = useState('');
  const [tags, setTags] = useState([]);
  const [activeTime, setActiveTime] = useState('');
  const [freq, setFreq] = useState('');
  const introCount = countWords(intro);
  const introValid = introCount >= 20 && introCount <= 60;

  function toggleTag(t) {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length < 5) setTags([...tags, t]);
    else toast('最多选 5 个标签');
  }
  function go2() { if (!nickname.trim()) return toast('请填写昵称'); if (!introValid) return toast('介绍需 20–60 字'); setStep(2); }
  function go3() { if (tags.length < 3) return toast('至少选 3 个标签'); setStep(3); }
  function finish() {
    completeProfile();
    toast('欢迎来到平常 ✦');
    navigate('/', { replace: true });
  }
  /* 引导中返回 = 放弃入驻回登录；重看模式返回上一页 */
  function back() {
    if (hasProfile) navigate(-1);
    else logout();
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title="注册引导" onBack={back} />
      <div className="progress-bar"><div className="progress-fill" style={{ width: (step / 3) * 100 + '%' }} /></div>
      <div className="step-indicator">{step} / 3</div>
      <div className="page-scroll">
        {step === 1 && (
          <div className="step-content tab-fade" key="1">
            <div className="step-header"><div className="step-title">建立你的精神身份证</div><div className="step-sub">让对的灵魂找到你</div></div>
            <div className="form-card card">
              <span className="form-label">你的名字</span>
              <input className="form-input" placeholder="给自己起个好听的名字" maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="form-card card">
              <div className="form-label-row"><span className="form-label">一句话介绍</span><span className={'form-count' + (introValid ? ' ok' : '')}>{introCount} / 20-60字</span></div>
              <textarea className="form-input form-textarea" placeholder="写下你的兴趣、性格或此刻的状态..." value={intro} onChange={(e) => setIntro(e.target.value)} />
            </div>
            <div className="btn btn-primary" style={{ width: '100%' }} onClick={go2}>下一步</div>
          </div>
        )}
        {step === 2 && (
          <div className="step-content tab-fade" key="2">
            <div className="step-header"><div className="step-title">选择你的兴趣标签</div><div className="step-sub">选 3–5 个，帮助找到同频的灵魂</div></div>
            <div className="tags-grid">
              {PRESET_TAGS.map((t) => <div key={t} className={'tag-option' + (tags.includes(t) ? ' selected' : '')} onClick={() => toggleTag(t)}>{t}</div>)}
            </div>
            <span className="tags-count">已选 {tags.length} 个（需 3-5 个）</span>
            <div className="btn-row">
              <div className="btn btn-ghost" onClick={() => setStep(1)}>上一步</div>
              <div className="btn btn-primary" onClick={go3}>下一步</div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="step-content tab-fade" key="3">
            <div className="step-header"><div className="step-title">你的书写节奏</div><div className="step-sub">帮助匹配志同道合的书写者</div></div>
            <div className="form-card card">
              <span className="form-label">你常在什么时候写信？</span>
              <div className="options-row" style={{ marginTop: 12 }}>
                {ACTIVE_OPTIONS.map(([v, ic, l]) => (
                  <div key={v} className={'option-item' + (activeTime === v ? ' active' : '')} onClick={() => setActiveTime(v)}>
                    <span className="option-icon">{ic}</span><span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-card card">
              <span className="form-label">你期望多久交流一次？</span>
              <div className="options-col" style={{ marginTop: 12 }}>
                {FREQ_OPTIONS.map(([v, t, d]) => (
                  <div key={v} className={'option-row-item' + (freq === v ? ' active' : '')} onClick={() => setFreq(v)}>
                    <span className="option-title">{t}</span><span className="option-desc">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="btn-row">
              <div className="btn btn-ghost" onClick={() => setStep(2)}>上一步</div>
              <div className="btn btn-primary" onClick={finish}>完成注册</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
