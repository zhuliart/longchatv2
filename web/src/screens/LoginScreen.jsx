/* 登录/注册（T5.4）：信封封面式（印章「常」+ 翻盖卡片）+ 双 Tab；
   校验：邮箱或 11 位手机号、密码 ≥6、注册二次一致。M6 接通 POST /auth/*。 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/chrome.jsx';
import { authApi } from '../api/index.js';
import { useAuth } from '../store/auth.jsx';
import { useUI } from '../store/ui.jsx';

export function useLoginForm() {
  const [mode, setMode] = useState('login');
  const [account, setAccount] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const isReg = mode === 'register';
  const accountOk = /^1\d{10}$/.test(account.trim()) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account.trim());
  const pwdOk = pwd.length >= 6;
  const matchOk = !isReg || (pwd2.length > 0 && pwd2 === pwd);
  const canGo = accountOk && pwdOk && matchOk;
  return { mode, setMode, account, setAccount, pwd, setPwd, pwd2, setPwd2, isReg, accountOk, pwdOk, canGo };
}

/* 登录卡片主体（移动端与桌面端 DLogin 复用同一组件结构） */
export function LoginCard({ form, onSubmit }) {
  const { mode, setMode, account, setAccount, pwd, setPwd, pwd2, setPwd2, isReg, canGo } = form;
  return (
    <div className="card login-card">
      <div className="login-flap" aria-hidden="true"></div>
      <div className="seg-tabs login-tabs">
        <div className={'seg-tab' + (!isReg ? ' active' : '')} onClick={() => setMode('login')}>登录</div>
        <div className={'seg-tab' + (isReg ? ' active' : '')} onClick={() => setMode('register')}>注册</div>
      </div>
      <div className="form-card login-field">
        <span className="form-label">邮箱 / 手机号</span>
        <input className="form-input" placeholder="you@example.com" value={account} onChange={(e) => setAccount(e.target.value)} />
      </div>
      <div className="form-card login-field">
        <span className="form-label">密码</span>
        <input className="form-input" type="password" placeholder={isReg ? '至少 6 位' : '请输入密码'} value={pwd} onChange={(e) => setPwd(e.target.value)} />
      </div>
      {isReg && (
        <div className="form-card login-field tab-fade">
          <span className="form-label">确认密码</span>
          <input className="form-input" type="password" placeholder="再输一次" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        </div>
      )}
      <div className={'btn btn-primary login-btn' + (canGo ? '' : ' btn-disabled')} onClick={() => onSubmit(mode)}>
        {isReg ? '创建账号，开始引导' : '登 录'}
      </div>
      <div className="login-note">{isReg ? '注册后将进入 3 步引导，完成你的「精神身份证」' : '首次使用？切到「注册」创建账号'}</div>
    </div>
  );
}

/* 登录提交（T6.4）：POST /auth/register|login → 发 token 存登录态 → 分流。
   register 后 hasProfile=false，路由守卫强制进入 /onboarding 闭环；
   login 按 hasProfile 分流（未完成引导者同样被守卫导向引导页）。
   业务错误（账号已注册 / 账号或密码不正确）已由 client 层 toast，提交处仅停在原页。 */
export function useLoginSubmit(form) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useUI();
  const [submitting, setSubmitting] = useState(false);
  const submit = async (mode) => {
    if (submitting) return;
    if (!form.canGo) {
      toast(!form.accountOk ? '请输入有效的邮箱或手机号' : !form.pwdOk ? '密码至少 6 位' : '两次密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const account = form.account.trim();
      const tokens =
        mode === 'register'
          ? await authApi.register(account, form.pwd)
          : await authApi.login(account, form.pwd);
      signIn(tokens);
      toast(mode === 'register' ? '账号已创建 ✦' : '欢迎回来 ✦');
      navigate('/', { replace: true });
    } catch {
      /* 错误提示已由 client 层 toast，停留在登录页 */
    } finally {
      setSubmitting(false);
    }
  };
  submit.submitting = submitting;
  return submit;
}

export function LoginScreen() {
  const form = useLoginForm();
  const submit = useLoginSubmit(form);
  return (
    <div className="page login-page">
      <StatusBar />
      <div className="login-scroll">
        <div className="login-hero">
          <div className="login-seal">常</div>
          <div className="login-title">平常</div>
          <div className="login-sub">写信 · 记情绪 · 慢慢遇见</div>
        </div>
        <LoginCard form={form} onSubmit={submit} />
        <div className="login-foot">继续即代表同意《平常公约》与《隐私说明》</div>
      </div>
    </div>
  );
}
