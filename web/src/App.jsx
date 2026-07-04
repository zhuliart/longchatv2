/* App 装配（T5.7）：路由守卫（无 token → 登录页；hasProfile=false → 强制引导页）
   + 响应式一体（<768px 移动版式 / ≥768px 桌面壳层，断点 1160/960 见 desktop.css）
   + 主题锁定（黛雾 + #9C7B86 + 黑体，机制保留不出 UI）。 */
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import { AuthProvider, useAuth } from './store/auth.jsx';
import { UIProvider, useUI } from './store/ui.jsx';
import { UserProvider } from './store/user.jsx';
import { MoodsProvider } from './store/moods.jsx';
import { setApiHandlers } from './api/index.js';
import { appRootClass, appRootStyle } from './theme.js';
import { useIsDesktop } from './utils/useMediaQuery.js';

import { TabBar, ComposeMenu } from './components/chrome.jsx';
import { Toast } from './components/Toast.jsx';

import { LoginScreen } from './screens/LoginScreen.jsx';
import { OnboardingScreen } from './screens/OnboardingScreen.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { InboxScreen } from './screens/InboxScreen.jsx';
import { JourneyScreen } from './screens/JourneyScreen.jsx';
import { MyProfileScreen } from './screens/MyProfileScreen.jsx';
import { WriteScreen } from './screens/WriteScreen.jsx';
import { DetailScreen } from './screens/DetailScreen.jsx';
import { MatchScreen } from './screens/MatchScreen.jsx';
import { PeerProfileScreen } from './screens/PeerProfileScreen.jsx';
import { EditScreen } from './screens/EditScreen.jsx';

import { DesktopShell } from './desktop/DesktopShell.jsx';
import { DLogin } from './desktop/DLogin.jsx';
import { DHome } from './desktop/DHome.jsx';
import { DInbox } from './desktop/DInbox.jsx';
import { DJourney } from './desktop/DJourney.jsx';
import { DProfile } from './desktop/DProfile.jsx';
import { DWrite } from './desktop/DWrite.jsx';

/* 守卫：未登录 → /login；未完成引导 → /onboarding（防跳过引导，对应服务端 T2.5） */
function RequireAuth() {
  const { token, hasProfile } = useAuth();
  const { pathname } = useLocation();
  if (!token) return <Navigate to="/login" replace />;
  if (!hasProfile && pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/* 已登录访问 /login → 回首页 */
function LoginGate({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return children;
}

const TAB_PATH = { home: '/', inbox: '/inbox', journey: '/journey', me: '/me' };

/* 移动端主 Tab 布局：viewport + 底部 TabBar + 放射写信菜单 */
function MobileTabLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [composeOpen, setComposeOpen] = useState(false);
  const active = Object.keys(TAB_PATH).find((k) => TAB_PATH[k] === pathname) || 'home';

  function pick(screen, params) {
    setComposeOpen(false);
    if (screen === 'write') return navigate('/write', { state: params });
    if (screen === 'match') return navigate('/match');
    const q = params && params.tab ? `?tab=${params.tab}` : '';
    navigate((TAB_PATH[screen] || '/') + q);
  }

  return (
    <>
      <div className="viewport">
        <Outlet />
        <ComposeMenu open={composeOpen} onClose={() => setComposeOpen(false)} onPick={pick} />
      </div>
      <TabBar active={active} onChange={(k) => { setComposeOpen(false); navigate(TAB_PATH[k]); }}
        onCompose={() => setComposeOpen((o) => !o)} composeOpen={composeOpen} />
    </>
  );
}

/* 移动端叠层页布局（写信/详情/匹配/主页/编辑）：占满 viewport，自右滑入（.is-overlay） */
function MobileOverlayLayout() {
  return (
    <div className="viewport">
      <Outlet />
    </div>
  );
}

function MobileRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginGate><div className="viewport"><LoginScreen /></div></LoginGate>} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<div className="viewport"><OnboardingScreen /></div>} />
        <Route element={<MobileTabLayout />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/inbox" element={<InboxScreen />} />
          <Route path="/journey" element={<JourneyScreen />} />
          <Route path="/me" element={<MyProfileScreen />} />
        </Route>
        <Route element={<MobileOverlayLayout />}>
          <Route path="/write" element={<WriteScreen />} />
          <Route path="/letter/:id" element={<DetailScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/peer/:uid" element={<PeerProfileScreen />} />
          <Route path="/edit" element={<EditScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* 桌面宽度打开移动详情路由 → 落到信箱阅读窗（桌面在 dsk-reader 内读信） */
function LetterRedirect() {
  const { id } = useParams();
  return <Navigate to={`/inbox?letter=${id}`} replace />;
}

function DesktopRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginGate><DLogin /></LoginGate>} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<div className="dsk-onboard"><OnboardingScreen /></div>} />
        <Route element={<DesktopShell />}>
          <Route path="/" element={<DHome />} />
          <Route path="/inbox" element={<DInbox />} />
          <Route path="/journey" element={<DJourney />} />
          <Route path="/me" element={<DProfile />} />
          <Route path="/write" element={<DWrite />} />
        </Route>
        <Route path="/letter/:id" element={<LetterRedirect />} />
        {/* 桌面原型未设计匹配/对方主页/编辑独立视图 → 回落 */}
        <Route path="/match" element={<Navigate to="/" replace />} />
        <Route path="/peer/:uid" element={<Navigate to="/" replace />} />
        <Route path="/edit" element={<Navigate to="/me" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppRoot() {
  const desktop = useIsDesktop();
  const { dark, toast } = useUI();

  /* 把 toast 与 401 处理注入 api client 层（页面不直连 fetch，统一由此层兜底） */
  useEffect(() => {
    setApiHandlers({
      toast,
      onUnauthorized: () => window.dispatchEvent(new Event('pc:unauthorized')),
    });
  }, [toast]);

  return (
    <div className={appRootClass({ dark, desktop })} style={appRootStyle()}>
      {desktop ? <DesktopRoutes /> : <MobileRoutes />}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <UserProvider>
          <MoodsProvider>
            <AppRoot />
          </MoodsProvider>
        </UserProvider>
      </UIProvider>
    </AuthProvider>
  );
}
