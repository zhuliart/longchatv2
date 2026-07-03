/* 信件详情（T5.4 + T5.6）：拆信动画 5 阶段（蜡封消失→封口翻折→信纸滑出→文字淡入），
   读/未读均播放；节奏系数锁定「轻快 0.6×」；prefers-reduced-motion 直接显示内容。 */
import { useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { Avatar } from '../components/primitives.jsx';
import { LETTERS, SENT } from '../mocks/index.js';
import { ANIM_SPEED } from '../theme.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { useUI } from '../store/ui.jsx';

export function OpenAnimation({ onDone, speed }) {
  const [stage, setStage] = useState(0);
  const startedRef = useRef(false);
  function play() {
    if (startedRef.current) return;
    startedRef.current = true;
    const s = speed || 1;
    setStage(1);
    setTimeout(() => setStage(2), 120 * s);
    setTimeout(() => setStage(3), 380 * s);
    setTimeout(() => onDone(), 1150 * s);
  }
  return (
    <div className="open-anim" data-stage={stage} onClick={play}>
      <div className="open-hint">{stage === 0 ? '轻触信封 · 拆开来信' : '正在拆信…'}</div>
      <div className="envelope-3d">
        <div className="env-base" />
        <div className="env-letter"><div className="scribble"><i/><i/><i/><i/></div></div>
        <div className="env-front" />
        <div className="env-flap" />
        <div className="env-wax"><div className="seal-stamp active" style={{ width: 48, height: 48, fontSize: 19 }}>平</div></div>
      </div>
    </div>
  );
}

export function DetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { search } = useLocation();
  const { toast } = useUI();
  const sent = new URLSearchParams(search).get('sent') === '1';
  const src = sent ? SENT : LETTERS;
  const letter = src.find((l) => l._id === id) || LETTERS[0];
  // 减弱动效时直接显示内容（T5.6）
  const [done, setDone] = useState(() => prefersReducedMotion());
  const name = sent ? letter.receiverNickname : letter.senderNickname;

  function back() { navigate(-1); }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title={sent ? '已寄出' : '来信'} onBack={back} />
      {!done ? (
        <OpenAnimation onDone={() => setDone(true)} speed={ANIM_SPEED} />
      ) : (
        <>
          <div className="page-scroll">
            <div className="detail-sender fade-in" onClick={() => !sent && navigate(`/peer/${letter.from_uid}`)}>
              <Avatar name={name} />
              <div>
                <div className="sender-name">{sent ? '致 ' + name : name}</div>
                <div className="sender-time">{letter.timeDisplay}</div>
              </div>
              {!sent && <span className="sender-arrow">›</span>}
            </div>
            <div className="read-paper fade-in">
              {letter.title && <div className="read-title">{letter.title}</div>}
              <div className="read-body">{letter.content}</div>
              <div className="read-sign">— {name}，于平常</div>
            </div>
            <div style={{ height: 12 }} />
          </div>
          {!sent && (
            <div className="action-bar">
              {/* M6 接通 POST /letters/:id/archive */}
              <div className="btn btn-ghost" onClick={() => { toast('已归档 ✦'); back(); }}>归档</div>
              <div className="btn btn-primary" onClick={() => navigate('/write', { state: { targetNickname: name, isFirst: false } })}>回信</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
