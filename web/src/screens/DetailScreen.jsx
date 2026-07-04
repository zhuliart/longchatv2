/* 信件详情（T5.4 + T5.6 / T6.2 #3、T6.3 打开未读信·归档·回信）：拆信动画 5 阶段，
   读/未读均播放；prefers-reduced-motion 直接显示内容。
   数据 GET /letters/:id（收件人首读服务端自动置 read）；归档 POST /letters/:id/archive；
   回信跳写信页（POST /letters/:id/reply）。 */
import { useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { StatusBar, NavBar } from '../components/chrome.jsx';
import { Avatar } from '../components/primitives.jsx';
import { Spinner, ErrorState } from '../components/states.jsx';
import { lettersApi, useResource } from '../api/index.js';
import { relativeTime } from '../utils/date.js';
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
  const { search, state } = useLocation();
  const { toast } = useUI();
  const sent = new URLSearchParams(search).get('sent') === '1';
  const { data: letter, loading, error, reload } = useResource(() => lettersApi.getLetter(id), [id]);
  // 减弱动效时直接显示内容（T5.6）
  const [done, setDone] = useState(() => prefersReducedMotion());
  const [archiving, setArchiving] = useState(false);

  // 已发出信 GET 只回 senderNickname（=我），收件人昵称由列表页经 state 传入
  const passedName = state?.name || '';
  const name = sent ? (passedName || '对方') : (letter?.senderNickname || passedName || '对方');

  function back() { navigate(-1); }

  async function archive() {
    if (archiving) return;
    setArchiving(true);
    try {
      await lettersApi.archiveLetter(id);
      toast('已归档 ✦');
      back();
    } catch {
      /* 网络异常已由 client 层 toast */
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="page is-overlay">
      <StatusBar dark />
      <NavBar title={sent ? '已寄出' : '来信'} onBack={back} />
      {!done ? (
        <OpenAnimation onDone={() => setDone(true)} speed={ANIM_SPEED} />
      ) : loading ? (
        <Spinner label="正在取信…" />
      ) : error || !letter ? (
        <ErrorState message="没能取到这封信" onRetry={reload} />
      ) : (
        <>
          <div className="page-scroll">
            <div className="detail-sender fade-in" onClick={() => !sent && letter.from_uid && navigate(`/peer/${letter.from_uid}`)}>
              <Avatar name={name} />
              <div>
                <div className="sender-name">{sent ? '致 ' + name : name}</div>
                <div className="sender-time">{relativeTime(letter.created_at)}</div>
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
              <div className={'btn btn-ghost' + (archiving ? ' btn-disabled' : '')} onClick={archive}>归档</div>
              <div className="btn btn-primary" onClick={() => navigate('/write', { state: { replyToId: letter._id, targetNickname: name, isFirst: false } })}>回信</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
