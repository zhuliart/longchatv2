/* 桌面登录（T5.5）：居中 400px 信封卡（复用移动端 LoginCard 组件） */
import { LoginCard, useLoginForm, useLoginSubmit } from '../screens/LoginScreen.jsx';

export function DLogin() {
  const form = useLoginForm();
  const submit = useLoginSubmit(form);
  return (
    <div className="dsk-login">
      <div className="dsk-login-box">
        <div className="login-hero">
          <div className="login-seal">常</div>
          <div className="login-title">平常</div>
          <div className="login-sub">写信 · 记情绪 · 慢慢遇见</div>
        </div>
        <LoginCard form={form} onSubmit={submit} />
        <div className="dsk-login-foot">继续即代表同意《平常公约》与《隐私说明》</div>
      </div>
    </div>
  );
}
