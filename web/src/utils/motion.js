/* 动效工具（T5.6）：prefers-reduced-motion 时跳过入场动画直接显示内容 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
