/* 主题机制（T5.1）：15 套主题的切换机制保留但 V1 不出 UI ——
   默认锁定「黛雾 theme-mist」+ 强调色 #9C7B86 + 正文黑体 + 信纸横线 + 柔光按钮 + 轻快动效。
   深色模式为「跟随主题」推导（styles.css .is-dark 段），由首页 theme-orb 切换。 */

export const THEME_CLASS = {
  蜜橘薄荷: 'theme-dopamine', 柔彩: 'theme-pastel', 黛雾: 'theme-mist', 墨绿: 'theme-ink',
  经典信笺: '', 暮光马戏: 'theme-circus', 山野绿意: 'theme-meadow', 夏日婚礼: 'theme-summer',
  夜读: 'theme-dusk', 霓虹: 'theme-neon',
};
export const DARK_CLASS = {
  夜读: 'theme-dusk', 暮紫: 'theme-wisteria', 极夜: 'theme-aurora', 暖灯: 'theme-lamp', 霓彩: 'theme-candy',
};
export const THEME_ACCENT = {
  蜜橘薄荷: '#D44720', 柔彩: '#E79BC6', 黛雾: '#9C7B86', 墨绿: '#1F6F66', 经典信笺: '#C4622D',
  暮光马戏: '#C0392B', 山野绿意: '#B5654A', 夏日婚礼: '#E08A6E', 夜读: '#E08A4E', 霓虹: '#FF4D9D',
};
export const PACE = { 舒缓: 1.6, 标准: 1, 轻快: 0.6 };

/* V1 视觉定稿 */
export const THEME_DEFAULTS = {
  theme: '黛雾',
  font: '黑体',
  accent: '#9C7B86',
  ruled: true,
  animPace: '轻快',
  btnStyle: '柔光',
  darkScheme: '跟随主题',
};

export const ANIM_SPEED = PACE[THEME_DEFAULTS.animPace];

/* 应用根 className / style（与原型 HTML 装配逻辑一致，参数化 dark 与桌面） */
export function appRootClass({ dark, desktop }) {
  const t = THEME_DEFAULTS;
  const themeClass = THEME_CLASS[t.theme] || '';
  const followDark = t.darkScheme === '跟随主题';
  const darkClass = followDark ? `${themeClass} is-dark` : DARK_CLASS[t.darkScheme] || 'theme-dusk';
  return [
    'device-screen',
    desktop ? 'dsk' : '',
    dark ? darkClass : themeClass,
    desktop ? (t.ruled ? 'ruled-on' : '') : t.ruled ? '' : 'norule',
    t.btnStyle === '玻璃' ? 'glass' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function appRootStyle() {
  const t = THEME_DEFAULTS;
  return {
    '--color-accent': t.accent,
    '--font-serif': t.font === '黑体' ? 'var(--font-sans)' : '"Noto Serif SC","Songti SC",serif',
  };
}
